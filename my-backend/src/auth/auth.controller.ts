// auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    console.log('🎯 Auth controller login endpoint hit');
    console.log('📝 Login data received:', { email: loginDto.email, passwordLength: loginDto.password?.length });
    
    try {
      const result = await this.authService.login(loginDto);
      console.log('✅ Login successful in controller');
      return result;
    } catch (error) {
      console.error('❌ Login error in controller:', error.message);
      throw error;
    }

    // On successful login, response contains:
    // {
    //   success: true,
    //   message: 'Login successful',
    //   data: {
    //     user: { id, email, name, businessId, role },
    //     business: { ... },
    //     token
    //   }
    // }
  }

  @Get('demo-setup')
  async setupDemo() {
    await this.authService.createDefaultUser();
    return {
      success: true,
      message: 'Demo user setup completed',
      credentials: {
        email: 'admin@vypar.com',
        password: 'admin123'
      }
    };
  }

  @Get('health')
  async health() {
    return {
      success: true,
      message: 'Auth service is running',
      timestamp: new Date().toISOString()
    };
  }
}
