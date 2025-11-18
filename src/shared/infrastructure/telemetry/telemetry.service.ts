import { Injectable, Logger } from '@nestjs/common';

/**
 * Serviço de Telemetria - Coleta métricas e observabilidade
 * Implementação básica para métricas do sistema
 */
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly metrics: Map<string, number> = new Map();

  /**
   * Incrementa um contador de métrica
   * @param metricName Nome da métrica
   * @param value Valor a incrementar (padrão: 1)
   */
  incrementCounter(metricName: string, value: number = 1): void {
    const current = this.metrics.get(metricName) || 0;
    this.metrics.set(metricName, current + value);
    this.logger.debug(`Métrica incrementada: ${metricName} = ${current + value}`);
  }

  /**
   * Define um valor de métrica
   * @param metricName Nome da métrica
   * @param value Valor a definir
   */
  setGauge(metricName: string, value: number): void {
    this.metrics.set(metricName, value);
    this.logger.debug(`Métrica definida: ${metricName} = ${value}`);
  }

  /**
   * Registra uma duração de operação
   * @param metricName Nome da métrica
   * @param durationMs Duração em milissegundos
   */
  recordDuration(metricName: string, durationMs: number): void {
    this.metrics.set(`${metricName}_duration_ms`, durationMs);
    this.logger.debug(`Duração registrada: ${metricName} = ${durationMs}ms`);
  }

  /**
   * Obtém o valor atual de uma métrica
   * @param metricName Nome da métrica
   * @returns Valor da métrica ou undefined se não existir
   */
  getMetric(metricName: string): number | undefined {
    return this.metrics.get(metricName);
  }

  /**
   * Obtém todas as métricas
   * @returns Objeto com todas as métricas
   */
  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Reseta todas as métricas
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.logger.debug('Métricas resetadas');
  }
}

