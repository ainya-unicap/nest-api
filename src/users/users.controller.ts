import { Controller, Post, Body, Get, Param, Put, UseInterceptors, UploadedFile, Req, UseGuards, HttpException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserSchema } from '../schemas/user.schema';
import { upload } from '../middlewares/upload.middleware';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('/')
  async create(@Body() body: UserSchema) {
    try {
      await this.usersService.create(body);
      return { message: 'created successfully' };
    } catch (err: any) {
      throw new HttpException(err.message || 'Error', err.status || 500);
    }
  }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getAll(@Req() req: any) {
    try {
      return await this.usersService.getAll();
    } catch (err: any) {
      throw new HttpException(err.message || 'Error', err.status || 500);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    try {
      return await this.usersService.findById(id);
    } catch (err: any) {
      throw new HttpException(err.message || 'Error', err.status || 500);
    }
  }

  @Put(':id/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    try {
      if (req.user?.id !== id) throw new HttpException('Você só pode atualizar o próprio perfil', 403);
      return await this.usersService.updateProfile(id, body);
    } catch (err: any) {
      throw new HttpException(err.message || 'Error', err.status || 500);
    }
  }

  @Put(':id/avatar')
  @UseGuards(JwtAuthGuard)
  async updateAvatar(@Param('id') id: string, @Req() req: any) {
    try {
      if (req.user?.id !== id) throw new HttpException('Você só pode atualizar o próprio avatar', 403);

      // Reusar multer directly: call upload.single middleware manually
      return new Promise((resolve, reject) => {
        const single = upload.single('avatar');
        single(req, req.res, async (err: any) => {
          if (err) return reject(new HttpException(err.message || 'Upload error', 400));

          if (!req.file) return reject(new HttpException('Arquivo de avatar é obrigatório', 400));

          let fileUrl: string;
          if (process.env.VERCEL) {
            // Em Nest não temos put do @vercel/blob instalado por default aqui — preservar comportamento original se package instalado
            try {
              const { put } = await import('@vercel/blob');
              const blob = await put(`avatars/${id}-${Date.now()}-${req.file.originalname}`, req.file.buffer, { access: 'public', contentType: req.file.mimetype });
              fileUrl = blob.url;
            } catch (err) {
              return reject(new HttpException('Falha ao enviar blob', 500));
            }
          } else {
            fileUrl = `/uploads/${req.file.filename}`;
          }

          try {
            const user = await this.usersService.updateAvatar(id, fileUrl);
            resolve(user);
          } catch (err: any) {
            reject(new HttpException(err.message || 'Error', err.status || 500));
          }
        });
      });
    } catch (err: any) {
      throw new HttpException(err.message || 'Error', err.status || 500);
    }
  }
}
