import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { FormulariosModule } from './modules/formularios/formularios.module';
import { CanteirosModule } from './modules/canteiros/canteiros.module';
import { ListaDeFormulariosModule } from './modules/listadeformularios/listadeformularios.module';
import { UserCanteirosModule } from './modules/user-canteiros/user-canteiros.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { PhotosModule } from './modules/photos/photos.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { PlantTemplatesModule } from './modules/plant-templates/plant-templates.module';
import { TurmasModule } from './modules/turmas/turmas.module';
import { AlunoTurmaModule } from './modules/aluno-turma/aluno-turma.module';
import { AcademicPeriodsModule } from './modules/academic-periods/academic-periods.module';
import { AlunosModule } from './modules/alunos/alunos.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    InstitutionsModule,
    FormulariosModule,
    CanteirosModule,
    ListaDeFormulariosModule,
    UserCanteirosModule,
    ChecklistModule,
    MeasurementsModule,
    PhotosModule,
    RelatoriosModule,
    PlantTemplatesModule,
    TurmasModule,
    AlunoTurmaModule,
    AcademicPeriodsModule,
    AlunosModule,
  ],
})
export class AppModule {}
