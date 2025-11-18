import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/presentation/filters/domain-exception.filter';
import { HttpExceptionFilter } from './shared/presentation/filters/http-exception.filter';
import { LoggingMiddleware } from './shared/infrastructure/middleware/logging.middleware';
import { Request, Response, NextFunction } from 'express';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Configuração de CORS
  const corsOriginsEnv = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null;

  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3009',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3009',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'file://',
    'null',
  ];

  const defaultProdOrigins = [
    // Domínios da plataforma Gwan Mart
    'https://mart.gwan.com.br',
    'https://www.mart.gwan.com.br',
    'http://mart.gwan.com.br',
    'http://www.mart.gwan.com.br',
    'https://api-mart.gwan.com.br',
    'https://www.api-mart.gwan.com.br',
    'http://api-mart.gwan.com.br',
    'http://www.api-mart.gwan.com.br',
    // Domínios Gwan (caso necessário)
    'https://gwan.com.br',
    'https://www.gwan.com.br',
    'http://gwan.com.br',
    'http://www.gwan.com.br',
  ];

  // Se CORS_ORIGINS estiver definido, usar ele (mesmo em desenvolvimento)
  // Caso contrário, usar as listas padrão
  const corsOrigins = corsOriginsEnv && corsOriginsEnv.length > 0
    ? corsOriginsEnv
    : (process.env.NODE_ENV === 'production'
        ? defaultProdOrigins
        : defaultDevOrigins);

  // Configuração de CORS mais permissiva
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requisições sem origem (ex: Postman, mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Em desenvolvimento, permitir TODAS as origens localhost (qualquer porta e qualquer path)
      if (isDevelopment) {
        const isLocalhost = origin.startsWith('http://localhost') || 
                           origin.startsWith('http://127.0.0.1') ||
                           origin.startsWith('https://localhost') ||
                           origin.startsWith('https://127.0.0.1');
        
        if (isLocalhost) {
          return callback(null, true);
        }
      }
      
      // Verificar se a origem está na lista permitida
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.log(`[CORS] ❌ Origem bloqueada: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Request-Id', 
      'Accept', 
      'Origin', 
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 horas
  });

  // Log das configurações de CORS para debug
  console.log('🔧 Configuração de CORS:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isDevelopment:', isDevelopment);
  console.log('CORS Origins permitidos:', corsOrigins);

  // Middleware adicional para garantir que CORS funcione em todas as requisições
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Se for requisição OPTIONS (preflight), responder imediatamente
    if (req.method === 'OPTIONS') {
      console.log(`[CORS] Preflight request de: ${origin || 'null'}`);
      
      // Permitir todas as origens localhost em desenvolvimento
      if (isDevelopment && origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, Accept, Origin, X-Requested-With');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');
        return res.status(204).send();
      }
    }
    
    next();
  });

  // Configuração de prefixo global
  app.setGlobalPrefix('api');

  // Middleware de logging de requests
  // const loggingMiddleware = new LoggingMiddleware();
  // app.use(loggingMiddleware.use);

  // Configuração de validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true, // Converte automaticamente strings para números/booleanos quando possível
    },
  }));

  // Configuração de Exception Filters globais
  app.useGlobalFilters(
    new DomainExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Rota raiz para redirecionar para a documentação
  app.getHttpAdapter().get('/', (req, res) => {
    res.redirect('/api');
  });

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Gwan Mart API')
    .setDescription('API da plataforma Gwan Mart - E-commerce completo para venda de produtos')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Digite o token JWT (sem o prefixo "Bearer ")',
        in: 'header',
      },
      'bearer', // Nome do esquema de segurança
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Token permanente para testes no Swagger (usuário ADMIN)
  // Gerado via: npm run generate:swagger-token
  const SWAGGER_TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGd3YW4uY29tLmJyIiwic3ViIjoiYjAzZThlOWYtMmU1MC00YTY2LWIxN2YtN2JjNzdmYmI0ZmM2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzYyMjc2Njk5LCJleHAiOjMxNzMwNjcxOTA5OX0.CpxSFzZvx796Avz8daw3tPld5ifmLJ7aebQqMyQJmRo';
  
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Salvar token entre sessões
    },
    customSiteTitle: 'Gwan Mart API - Documentação',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .auth-wrapper { margin: 10px 0; }
    `,
    customJs: `
      (function() {
        const token = '${SWAGGER_TEST_TOKEN}';
        let attempts = 0;
        const maxAttempts = 50; // Tentar por até 5 segundos
        
        function preauthorizeToken() {
          attempts++;
          
          try {
            // Método 1: Usar preauthorizeApiKey (método oficial do Swagger UI)
            if (typeof window.ui !== 'undefined' && window.ui.preauthorizeApiKey) {
              window.ui.preauthorizeApiKey('bearer', token);
              console.log('✅ Token pré-autorizado via preauthorizeApiKey');
              
              // Verificar se o token foi realmente aplicado
              setTimeout(function() {
                const authBtn = document.querySelector('button.authorize');
                if (authBtn && authBtn.classList.contains('locked')) {
                  console.log('✅ Token aplicado com sucesso - botão Authorize está bloqueado');
                } else {
                  console.log('⚠️ Token pode não ter sido aplicado corretamente');
                }
              }, 1000);
              return;
            }
            
            // Método 2: Se preauthorizeApiKey não funcionou, tentar preencher o modal manualmente
            if (attempts < maxAttempts) {
              setTimeout(preauthorizeToken, 100);
            } else {
              // Última tentativa: abrir o modal e preencher
              const authorizeButton = document.querySelector('button.authorize');
              if (authorizeButton) {
                authorizeButton.click();
                setTimeout(function() {
                  const modalInput = document.querySelector('.auth-container input[type="text"], .auth-container input[type="password"]');
                  if (modalInput) {
                    modalInput.value = token;
                    modalInput.dispatchEvent(new Event('input', { bubbles: true }));
                    modalInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Clicar no botão de autorizar
                    setTimeout(function() {
                      const authorizeBtn = document.querySelector('.auth-container button.btn-done, .auth-container button[type="button"]');
                      if (authorizeBtn) {
                        authorizeBtn.click();
                        console.log('✅ Token preenchido e autorizado via modal');
                      }
                    }, 200);
                  }
                }, 300);
              }
            }
          } catch (e) {
            console.log('Erro ao pré-preencher token (tentativa ' + attempts + '):', e);
            if (attempts < maxAttempts) {
              setTimeout(preauthorizeToken, 100);
            }
          }
        }
        
        // Aguardar carregamento completo da página
        if (document.readyState === 'complete') {
          setTimeout(preauthorizeToken, 1000);
        } else {
          window.addEventListener('load', function() {
            setTimeout(preauthorizeToken, 1000);
          });
        }
        
        // Também tentar quando o Swagger UI estiver pronto
        window.addEventListener('DOMContentLoaded', function() {
          setTimeout(preauthorizeToken, 1500);
        });
      })();
    `,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📚 Documentação disponível em http://localhost:${port}/api`);

  return { app, document };
}

bootstrap();
