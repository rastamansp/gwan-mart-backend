import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { Conversation } from './domain/entities/conversation.entity';
import { Message } from './domain/entities/message.entity';
import { UserCredit } from './domain/entities/user-credit.entity';
import { Agent } from './domain/entities/agent.entity';
import { ConsoleLoggerService } from './infrastructure/logger/console-logger.service';
import { UserTypeOrmRepository } from './infrastructure/repositories/user-typeorm.repository';
import { ConversationTypeOrmRepository } from './infrastructure/repositories/conversation-typeorm.repository';
import { MessageTypeOrmRepository } from './infrastructure/repositories/message-typeorm.repository';
import { UserCreditTypeOrmRepository } from './infrastructure/repositories/user-credit-typeorm.repository';
import { QRCodeService } from './infrastructure/services/qrcode.service';
import { EmbeddingService } from './infrastructure/services/embedding.service';
import { OpenAIService } from './infrastructure/services/openai.service';
import { LoggingService } from './infrastructure/logger/logging.service';
import { TelemetryService } from './infrastructure/telemetry/telemetry.service';
import { ILogger } from './application/interfaces/logger.interface';
import { IQRCodeService } from './application/interfaces/qrcode.interface';
import { IEmbeddingService } from './application/interfaces/embedding-service.interface';
import { IUserRepository } from './domain/interfaces/user-repository.interface';
import { IConversationRepository } from './domain/interfaces/conversation-repository.interface';
import { IMessageRepository } from './domain/interfaces/message-repository.interface';
import { IUserCreditRepository } from './domain/interfaces/user-credit-repository.interface';
import { IAgentRepository } from './domain/interfaces/agent-repository.interface';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { PromoteUserToCorretorUseCase } from './application/use-cases/promote-user-to-corretor.use-case';
import { CreateOrFindConversationUseCase } from './application/use-cases/create-or-find-conversation.use-case';
import { SaveMessageUseCase } from './application/use-cases/save-message.use-case';
import { RegisterUserViaWhatsappUseCase } from './application/use-cases/register-user-via-whatsapp.use-case';
import { AddCreditUseCase } from './application/use-cases/add-credit.use-case';
import { GetUserBalanceUseCase } from './application/use-cases/get-user-balance.use-case';
import { GetOrSetUserPreferredAgentUseCase } from './application/use-cases/get-or-set-user-preferred-agent.use-case';
import { ResolveConversationAgentUseCase } from './application/use-cases/resolve-conversation-agent.use-case';
import { AgentTypeOrmRepository } from './infrastructure/repositories/agent-typeorm.repository';
import { MinioStorageService } from './infrastructure/services/minio-storage.service';
import { ImageProcessorService } from './infrastructure/services/image-processor.service';
import { IStorageService } from './application/interfaces/storage-service.interface';
import { IImageProcessorService } from './application/interfaces/image-processor-service.interface';
import { forwardRef } from '@nestjs/common';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Conversation, Message, UserCredit, Agent]),
    forwardRef(() => {
      const { WhatsappWebhookModule } = require('../whatsapp-webhook/whatsapp-webhook.module');
      return WhatsappWebhookModule;
    }),
    forwardRef(() => {
      const { ChatModule } = require('../chat/chat.module');
      return ChatModule;
    }),
  ],
  providers: [
    // Logger
    {
      provide: 'ILogger',
      useClass: ConsoleLoggerService,
    },

    // Services
    {
      provide: 'IQRCodeService',
      useClass: QRCodeService,
    },
    {
      provide: 'IEmbeddingService',
      useClass: EmbeddingService,
    },
    
    // Wrapper Services
    OpenAIService,
    LoggingService,
    TelemetryService,
    
    // Repositories
    {
      provide: 'IUserRepository',
      useClass: UserTypeOrmRepository,
    },
    {
      provide: 'IConversationRepository',
      useClass: ConversationTypeOrmRepository,
    },
    {
      provide: 'IMessageRepository',
      useClass: MessageTypeOrmRepository,
    },
    {
      provide: 'IUserCreditRepository',
      useClass: UserCreditTypeOrmRepository,
    },
    {
      provide: 'IAgentRepository',
      useClass: AgentTypeOrmRepository,
    },
    {
      provide: 'IStorageService',
      useClass: MinioStorageService,
    },
    {
      provide: 'IImageProcessorService',
      useClass: ImageProcessorService,
    },

    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    PromoteUserToCorretorUseCase,
    CreateOrFindConversationUseCase,
    SaveMessageUseCase,
    RegisterUserViaWhatsappUseCase,
    AddCreditUseCase,
    GetUserBalanceUseCase,
    GetOrSetUserPreferredAgentUseCase,
    ResolveConversationAgentUseCase,
  ],
  exports: [
    'ILogger',
    'IQRCodeService',
    'IEmbeddingService',
    OpenAIService,
    LoggingService,
    TelemetryService,
    'IUserRepository',
    'IConversationRepository',
    'IMessageRepository',
    'IUserCreditRepository',
    'IAgentRepository',
    'IStorageService',
    'IImageProcessorService',
    RegisterUserUseCase,
    LoginUserUseCase,
    PromoteUserToCorretorUseCase,
    CreateOrFindConversationUseCase,
    SaveMessageUseCase,
    RegisterUserViaWhatsappUseCase,
    AddCreditUseCase,
    GetUserBalanceUseCase,
    GetOrSetUserPreferredAgentUseCase,
    ResolveConversationAgentUseCase,
  ],
})
export class SharedModule {}
