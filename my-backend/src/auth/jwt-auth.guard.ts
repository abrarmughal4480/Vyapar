import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      // Allow demo tokens for development
      const authHeader = request.headers.authorization;
      if (authHeader && (authHeader.includes('demo-token') || authHeader.includes('fallback-token'))) {
        console.log('Allowing demo token access');
        return true;
      }
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify(token);
      request['user'] = payload;
      return true;
    } catch (error) {
      // Allow demo tokens even if verification fails
      const authHeader = request.headers.authorization;
      if (authHeader && (authHeader.includes('demo-token') || authHeader.includes('fallback-token'))) {
        console.log('Allowing demo token access (verification failed)');
        return true;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
