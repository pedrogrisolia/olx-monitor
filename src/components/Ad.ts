import * as notifier from './Notifier';
import logger from './Logger';
import { formatPrice } from '../utils/priceFormatter';
import * as adRepository from '../repositories/adRepository';
import type { AdRow } from '../types';

/**
 * Dados de entrada para criar um Ad
 */
interface AdInput {
  id: number;
  url: string;
  title: string;
  searchTerm: string;
  price: number;
  notify: boolean;
  userId?: number | null;
  chatId?: string | number | null;
}

/**
 * Classe que representa um anúncio do OLX
 * Responsável por processar, validar e gerenciar anúncios
 */
class Ad {
  id: number;
  url: string;
  title: string;
  searchTerm: string;
  price: number;
  valid: boolean;
  saved: AdRow | null;
  notify: boolean;
  userId: number | null;
  chatId: string | number | null;

  constructor(ad: AdInput) {
    this.id = ad.id;
    this.url = ad.url;
    this.title = ad.title;
    this.searchTerm = ad.searchTerm;
    this.price = ad.price;
    this.valid = false;
    this.saved = null;
    this.notify = ad.notify;
    this.userId = ad.userId || null;
    this.chatId = ad.chatId || null;
  }

  /**
   * Processa o anúncio: valida, verifica se existe e toma ação apropriada
   */
  process = async (): Promise<boolean> => {
    if (!this.isValidAd()) {
      logger.debug('Ad not valid');
      return false;
    }

    try {
      // check if this entry was already added to DB
      if (await this.alreadySaved()) {
        return this.checkPriceChange();
      } else {
        // create a new entry in the database
        return this.addToDataBase();
      }
    } catch (error) {
      logger.error(error as Error);
      return false;
    }
  };

  /**
   * Verifica se o anúncio já existe no banco de dados
   */
  alreadySaved = async (): Promise<boolean> => {
    try {
      this.saved = await adRepository.getAd(this.id);
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Adiciona o anúncio ao banco de dados e notifica se necessário
   */
  addToDataBase = async (): Promise<boolean> => {
    try {
      await adRepository.createAd(this);
      logger.info('Ad ' + this.id + ' added to the database');
    } catch (error) {
      logger.error(error as Error);
    }

    if (this.notify) {
      try {
        const msg =
          '🆕 Novo anúncio encontrado!\n' +
          this.title +
          ' - ' +
          formatPrice(this.price) +
          '\n\n' +
          this.url;
        await notifier.sendNotification(msg, this.chatId);
      } catch (error) {
        logger.error('Could not send a notification');
      }
    }

    return true;
  };

  /**
   * Atualiza o preço do anúncio no banco de dados
   */
  updatePrice = async (): Promise<void> => {
    logger.info('updatePrice');

    try {
      await adRepository.updateAd(this);
    } catch (error) {
      logger.error(error as Error);
    }
  };

  /**
   * Verifica se houve mudança de preço e notifica se houver redução > 5%
   */
  checkPriceChange = async (): Promise<boolean> => {
    if (this.saved && this.price !== this.saved.price) {
      await this.updatePrice();

      // just send a notification if the price dropped and reduction is greater than 5%
      if (this.notify && this.price < this.saved.price) {
        const decreasePercentage = Math.abs(
          Math.round(((this.price - this.saved.price) / this.saved.price) * 100)
        );

        // Apenas notificar se a redução for maior que 5%
        if (decreasePercentage > 5) {
          logger.info('This ad had a price reduction: ' + this.url);

          const msg =
            '📉 Preço baixou ' +
            decreasePercentage +
            '%!\n' +
            'De ' +
            formatPrice(this.saved.price) +
            ' para ' +
            formatPrice(this.price) +
            '\n\n' +
            this.url;

          try {
            await notifier.sendNotification(msg, this.chatId);
          } catch (error) {
            logger.error(error as Error);
          }
        } else {
          logger.debug(
            `Price reduction of ${decreasePercentage}% is less than 5%, notification skipped`
          );
        }
      }
    }

    return true;
  };

  /**
   * Valida se o anúncio possui os dados mínimos necessários
   * Alguns elementos do OLX não são anúncios válidos
   */
  isValidAd = (): boolean => {
    if (!isNaN(this.price) && this.url && this.id) {
      this.valid = true;
      return true;
    } else {
      this.valid = false;
      return false;
    }
  };
}

export default Ad;

// Mantém compatibilidade com require() CommonJS
module.exports = Ad;
