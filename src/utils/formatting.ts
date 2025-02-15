import { format, formatDistance, formatRelative, Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

type SupportedLocale = 'en' | 'es';

interface LocaleConfig {
  locale: Locale;
  dateFormat: string;
  timeFormat: string;
  dateTimeFormat: string;
}

const localeConfigs: Record<SupportedLocale, LocaleConfig> = {
  en: {
    locale: enUS,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'MM/dd/yyyy HH:mm:ss'
  },
  es: {
    locale: es,
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'dd/MM/yyyy HH:mm:ss'
  }
};

export class FormattingUtils {
  static formatDate(
    date: Date | number,
    locale: SupportedLocale = 'en'
  ): string {
    const config = localeConfigs[locale];
    return format(date, config.dateFormat, {
      locale: config.locale
    });
  }

  static formatTime(
    date: Date | number,
    locale: SupportedLocale = 'en'
  ): string {
    const config = localeConfigs[locale];
    return format(date, config.timeFormat, {
      locale: config.locale
    });
  }

  static formatDateTime(
    date: Date | number,
    locale: SupportedLocale = 'en'
  ): string {
    const config = localeConfigs[locale];
    return format(date, config.dateTimeFormat, {
      locale: config.locale
    });
  }

  static formatDistanceToNow(
    date: Date | number,
    locale: SupportedLocale = 'en'
  ): string {
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: localeConfigs[locale].locale
    });
  }

  static formatRelativeToNow(
    date: Date | number,
    locale: SupportedLocale = 'en'
  ): string {
    return formatRelative(date, new Date(), {
      locale: localeConfigs[locale].locale
    });
  }

  static formatCurrency(
    amount: number,
    currency: string = 'USD',
    locale: SupportedLocale = 'en'
  ): string {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      style: 'currency',
      currency
    }).format(amount);
  }

  static formatNumber(
    number: number,
    locale: SupportedLocale = 'en',
    options?: Intl.NumberFormatOptions
  ): string {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', options).format(number);
  }

  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  static formatPhoneNumber(
    phoneNumber: string,
    countryCode: string = 'US'
  ): string {
    // Basic US phone number formatting
    if (countryCode === 'US') {
      const cleaned = phoneNumber.replace(/\D/g, '');
      const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
      if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
      }
    }
    return phoneNumber;
  }

  static truncateText(
    text: string,
    maxLength: number,
    suffix: string = '...'
  ): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  static titleCase(text: string): string {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}