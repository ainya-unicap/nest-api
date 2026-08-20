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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PhotoService } from '../../services/photo.service';
import { uploadOptions } from '../../core/upload.config';
import { persistUploadedFile } from '../../core/storage';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const photoSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    form_id: { type: 'string', format: 'uuid' },
    url: { type: 'string', example: '/uploads/1779628628205-26266628.png' },
    takenAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Photos')
@ApiAuth()
@Controller('photos')
export class PhotosController {
  constructor(private readonly photoService: PhotoService) {}

  @Post()
  @ApiOperation({
    summary: 'Registra uma foto já hospedada',
    description: 'Use quando a URL já existe. Para enviar o arquivo, use POST /photos/upload.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['form_id', 'url'],
      properties: {
        form_id: { type: 'string', format: 'uuid' },
        url: { type: 'string', example: 'https://.../foto.png' },
      },
    },
  })
  @ApiCreatedResponse({ schema: photoSchema })
  async create(@Body() body: { form_id: string; url: string }) {
    return await this.photoService.create(body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('photo', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Envia o arquivo da foto',
    description:
      'Aceita JPEG, PNG ou WEBP até 5 MB. Em dev grava em public/uploads; em produção sobe pro Vercel Blob.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo', 'form_id'],
      properties: {
        photo: { type: 'string', format: 'binary' },
        form_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiCreatedResponse({ schema: photoSchema })
  @ApiBadRequestResponse({
    schema: errorSchema('Tipo de arquivo inválido. Use JPEG, PNG ou WEBP.'),
  })
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

    const url = await persistUploadedFile(file, 'photos');
    return await this.photoService.create({ form_id: formId, url });
  }

  // Nest não soma decorators de rota empilhados — os dois aliases precisam
  // vir no mesmo decorator, como array.
  @Post(['form/:formId', 'formulario/:formularioId'])
  @ApiOperation({
    summary: 'Registra uma foto num formulário',
    description: 'Aceita os aliases /form/:formId e /formulario/:formularioId.',
  })
  @ApiParam({ name: 'formId', description: 'id do formulário', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url'],
      properties: { url: { type: 'string', example: 'https://.../foto.png' } },
    },
  })
  @ApiCreatedResponse({ schema: photoSchema })
  async createForFormulario(
    @Body() body: { url: string },
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
  ) {
    const id = formId ?? formularioId;

    if (!id) {
      throw new BadRequestException('form_id é obrigatório');
    }

    return await this.photoService.create({ form_id: id, url: body.url });
  }

  @Get(['form/:formId', 'formulario/:formularioId'])
  @ApiOperation({
    summary: 'Lista as fotos de um formulário',
    description: 'Aceita os aliases /form/:formId e /formulario/:formularioId.',
  })
  @ApiParam({ name: 'formId', description: 'id do formulário', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: photoSchema } })
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
  @ApiOperation({ summary: 'Remove uma foto' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: photoSchema })
  async delete(@Param('id') id: string) {
    return await this.photoService.delete(id);
  }
}
