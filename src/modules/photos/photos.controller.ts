import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotoService } from '../../services/photo.service';

@Controller('photos')
export class PhotosController {
  constructor(private readonly photoService: PhotoService) {}

  @Post()
  async create(@Body() body: { form_id: string; url: string }) {
    return await this.photoService.create(body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('photo'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('form_id') formId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de foto é obrigatório');
    }

    if (!formId) {
      throw new BadRequestException('form_id é obrigatório');
    }

    const url = `/uploads/${file.filename ?? file.originalname}`;
    return await this.photoService.create({ form_id: formId, url });
  }

  @Post('form/:formId')
  @Post('formulario/:formularioId')
  async createForFormulario(
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
    @Body() body: { url: string },
  ) {
    const id = formId ?? formularioId;

    if (!id) {
      throw new BadRequestException('form_id é obrigatório');
    }

    return await this.photoService.create({
      form_id: id,
      url: body.url,
    });
  }

  @Get('form/:formId')
  @Get('formulario/:formularioId')
  async findByFormulario(
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
  ) {
    const id = formId ?? formularioId;

    if (!id) {
      throw new BadRequestException('form_id é obrigatório');
    }

    return await this.photoService.findByFormulario(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.photoService.delete(id);
  }
}
