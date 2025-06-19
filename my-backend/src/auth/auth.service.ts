// auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password, name, businessName } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create business first
    const business = await this.prisma.business.create({
      data: {
        name: businessName || `${name}'s Business`,
        email: email,
        phone: '',
        address: '',
      },
    });

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        businessId: business.id,
        role: 'ADMIN',
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, businessId: business.id };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: business.id,
          role: user.role,
        },
        business: {
          id: business.id,
          name: business.name,
        },
        token,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    console.log('🔐 Login attempt for:', email);

    // Check for demo credentials first
    if (email === 'admin@vypar.com' && password === 'admin123') {
      console.log('🎯 Demo login detected, creating/finding demo user');
      
      let user = await this.prisma.user.findUnique({
        where: { email },
        include: { business: true },
      });

      if (!user) {
        console.log('📝 Creating demo user and business');
        
        // Create demo business
        const business = await this.prisma.business.create({
          data: {
            name: 'Demo Business',
            email: 'admin@vypar.com',
            phone: '+91 98765 43210',
            address: 'Demo Address, Demo City',
          },
        });

        // Create demo user with hashed password
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await this.prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name: 'Demo Admin',
            businessId: business.id,
            role: 'ADMIN',
          },
          include: { business: true },
        });

        console.log('✅ Demo user created successfully');
      } else {
        console.log('✅ Demo user found, logging in');
      }

      // Generate JWT token
      const payload = { 
        sub: user.id, 
        email: user.email, 
        businessId: user.businessId,
        role: user.role 
      };
      const token = this.jwtService.sign(payload);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            businessId: user.businessId,
            role: user.role,
          },
          business: user.business,
          token,
        },
      };
    }

    // Regular user login
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { business: true },
    });

    if (!user) {
      console.log('❌ User not found:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('✅ Regular user login successful:', email);

    // Generate JWT token
    const payload = { 
      sub: user.id, 
      email: user.email, 
      businessId: user.businessId,
      role: user.role 
    };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: user.businessId,
          role: user.role,
        },
        business: user.business,
        token,
      },
    };
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { business: true },
    });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return user;
  }

  async createDefaultUser() {
    try {
      // Check if demo user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: 'admin@vypar.com' },
      });

      if (existingUser) {
        console.log('Demo user already exists');
        return;
      }

      // Create demo business
      const business = await this.prisma.business.create({
        data: {
          name: 'Demo Business',
          email: 'admin@vypar.com',
          phone: '+91 98765 43210',
          address: 'Demo Address, Demo City',
        },
      });

      // Create demo user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const user = await this.prisma.user.create({
        data: {
          email: 'admin@vypar.com',
          password: hashedPassword,
          name: 'Demo Admin',
          businessId: business.id,
          role: 'ADMIN',
        },
      });

      console.log('✅ Demo user created successfully');
      console.log('📧 Email: admin@vypar.com');
      console.log('🔑 Password: admin123');
    } catch (error) {
      console.error('Error creating demo user:', error);
    }
  }
}



