import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '../../application/interfaces/logger.interface';

/**
 * Serviço de Logging - Wrapper para funcionalidades de log
 * Fornece interface compatível com o ProductsModule
 */
@Injectable()
export class LoggingService {
  constructor(
    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {}

  /**
   * Registra uma mensagem de log
   * @param message Mensagem a ser logada
   * @param context Contexto adicional (opcional)
   * @param metadata Metadados adicionais (opcional)
   */
  log(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logMessage = context
      ? `[${context}] ${message}`
      : message;

    if (metadata && Object.keys(metadata).length > 0) {
      this.logger.info(logMessage, metadata);
    } else {
      this.logger.info(logMessage);
    }
  }

  /**
   * Registra uma mensagem de warning
   * @param message Mensagem a ser logada
   * @param context Contexto adicional (opcional)
   * @param metadata Metadados adicionais (opcional)
   */
  warn(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logMessage = context
      ? `[${context}] ${message}`
      : message;

    if (metadata && Object.keys(metadata).length > 0) {
      this.logger.warn(logMessage, metadata);
    } else {
      this.logger.warn(logMessage);
    }
  }

  /**
   * Registra uma mensagem de erro
   * @param message Mensagem a ser logada
   * @param context Contexto adicional (opcional)
   * @param metadata Metadados adicionais (opcional)
   */
  error(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logMessage = context
      ? `[${context}] ${message}`
      : message;

    if (metadata && Object.keys(metadata).length > 0) {
      this.logger.error(logMessage, metadata);
    } else {
      this.logger.error(logMessage);
    }
  }

  /**
   * Registra uma mensagem de debug
   * @param message Mensagem a ser logada
   * @param context Contexto adicional (opcional)
   * @param metadata Metadados adicionais (opcional)
   */
  debug(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logMessage = context
      ? `[${context}] ${message}`
      : message;

    if (metadata && Object.keys(metadata).length > 0) {
      this.logger.debug(logMessage, metadata);
    } else {
      this.logger.debug(logMessage);
    }
  }
}

