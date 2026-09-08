import { Injectable, inject } from '@angular/core';
import { SessionService } from '../session/session.service';
import { LOCALES, Sign } from '@zskarte/types';
import { SIDEBAR_TRANSLATIONS } from './translations/sidebar.translations';
import { MAP_TRANSLATIONS } from './translations/map.translations';
import { LAYER_TRANSLATIONS } from './translations/layer.translations';
import { JOURNAL_TRANSLATIONS } from './translations/journal.translations';
import { DOCUMENTATION_TRANSLATIONS } from './translations/documentation.translations';
import { RESOURCE_TRANSLATIONS } from './translations/resource.translations';

/**
 * Translation Management Guide - ZSKarte Application
 *
 * Supports: German (de), English (en), French (fr)
 *
 * ADDING NEW TRANSLATIONS:
 *
 * 1. Choose the RIGHT location:
 *    • CORE (this file): Cross-domain, common UI, auth, basic actions
 *    • SIDEBAR: the texts for the different sidebars
 *    • LAYER: the layer & filter sidebar & layer option dialogs
 *    • MAP: Map tools, map interactions, search, sign selection, selected feature sidebar
 *    • JOURNAL: Message workflow, triage, departments, communication, journal sidebar
 *    • DOCUMENTATION: Help text, guides, tutorials
 *    • <Any new module needed>
 *
 * 2. Use this format:
 *    yourKey: {
 *      de: 'German text',
 *      en: 'English text',
 *      fr: 'French text',
 *    }
 *
 * KEEP TRANSLATIONS MODULAR - Don't dump everything in core!
 */
@Injectable({
  providedIn: 'root',
})
export class I18NService {
  private _session = inject(SessionService);

  private static TRANSLATIONS = {
    //general texts used on different areas
    edit: {
      de: 'Bearbeiten',
      en: 'Edit',
      fr: 'Modifier',
    },
    save: {
      de: 'Speichern',
      en: 'Save',
      fr: 'Enregistrer',
    },
    remove: {
      de: 'Entfernen',
      en: 'Remove',
      fr: 'Supprimer',
    },
    print: {
      de: 'Drucken',
      en: 'Print',
      fr: 'Imprimer',
    },
    createdAt: {
      de: 'Erstelldatum',
      en: 'Created at',
      fr: 'Date de création',
    },
    label: {
      de: 'Beschriftung',
      en: 'Label',
      fr: 'Etiquette',
    },
    name: {
      de: 'Name',
      en: 'Name',
      fr: 'Nom',
    },
    type: {
      de: 'Typ',
      en: 'Type',
      fr: 'Type',
    },
    filter: {
      de: 'Filter',
      en: 'Filter',
      fr: 'Filtre',
    },
    opacity: {
      de: 'Deckkraft',
      en: 'Opacity',
      fr: 'Opacité',
    },
    download: {
      de: 'Herunterladen',
      en: 'Download',
      fr: 'Télécharger',
    },
    upload: {
      de: 'Hochladen',
      en: 'Upload',
      fr: 'Uploader',
    },

    carefull: {
      de: 'Achtung',
      en: 'Carefull',
      fr: 'Attention',
    },
    info: {
      de: 'Information',
      en: 'Information',
      fr: 'Information',
    },
    ok: {
      de: 'OK',
      en: 'OK',
      fr: 'OK',
    },
    cancel: {
      de: 'Abbrechen',
      en: 'Cancel',
      fr: 'Annuler',
    },
    confirm: {
      de: 'Bestätigen',
      en: 'Confirm',
      fr: 'Confirmer',
    },
    close: {
      de: 'Schliessen',
      en: 'Close',
      fr: 'Conclure',
    },
    yes: {
      de: 'Ja',
      en: 'Yes',
      fr: 'Oui',
    },
    no: {
      de: 'Nein',
      en: 'No',
      fr: 'Non',
    },
    back: {
      de: 'Zurück',
      en: 'Back',
      fr: 'Retour',
    },

    //coordinates format
    selectFormat: {
      de: 'Format wählen',
      en: 'Select format',
      fr: 'Sélectionnez le format',
    },
    numerical: {
      de: 'numerisch',
      en: 'numerical',
      fr: 'numérique',
    },

    //login view
    loginTitle: {
      de: 'Login',
      en: 'Login',
      fr: 'Connexion',
    },
    loginOrganization: {
      de: 'ZSO',
      en: 'Organization', 
      fr: 'Organisation',
    },
    enterOrganization: {
      de: 'Organisation eingeben',
      en: 'Enter organization',
      fr: 'Entrer organisation',
    },
    enterPassword: {
      de: 'Passwort eingeben',
      en: 'Enter password',
      fr: 'Entrer mot de passe',
    },
    login: {
      de: 'Login',
      en: 'Login', 
      fr: 'Connexion',
    },
    or: {
      de: 'oder',
      en: 'or',
      fr: 'ou',
    },
    codeLogin: {
      de: 'Login mit Code',
      en: 'Login with code',
      fr: 'Connexion avec code',
    },
    loginCode: {
      de: 'Login-Code',
      en: 'Login code',
      fr: 'Code de connexion',
    },
    enterLoginCode: {
      de: 'Login-Code eingeben',
      en: 'Enter login code',
      fr: 'Entrer code de connexion',
    },
    guestLogin: {
      de: 'Als Gast fortfahren',
      en: 'Continue as guest',
      fr: 'Connexion en tant que visiteur',
    },
    deletionNotification: {
      de: 'Die erfassten Daten werden jeden Abend um 00:00 Uhr gelöscht. Die Daten sind nach diesem Vorgang nicht mehr vorhanden.',
      en: 'The recorded data is deleted every evening at 00:00. The data is no longer available after this process.',
      fr: 'Les données saisies sont effacées chaque soir à 00:00. Les données ne sont plus disponibles après ce processus.',
    },
    workLocal: {
      de: 'Offline/lokal arbeiten',
      en: 'Work offline/locally',
      fr: 'Travailler hors ligne/localement',
    },
    localNotification: {
      de: 'Die erfassten Daten sind nur im Browser gespeichert, bitte exportiert sie um sie zu sichern.',
      en: 'The collected data is only stored in the browser, please export it to save it.',
      fr: 'Les données collectées sont uniquement enregistrées dans le navigateur, veuillez les exporter pour les enregistrer.',
    },
    password: {
      de: 'Passwort',
      en: 'Password',
      fr: 'Mot de passe',
    },
    wrongPassword: {
      de: 'Ungültiges Passwort',
      en: 'Wrong password',
      fr: 'Mauvais mot de passe',
    },

    //Operation overview
    newScenario: {
      de: 'Neues Ereignis',
      en: 'New Scenario',
      fr: 'Nouvel Événement',
    },
    operationName: {
      de: 'Name',
      en: 'Name',
      fr: 'Nom',
    },
    enterName: {
      de: 'Name eingeben',
      en: 'Enter name',
      fr: 'Entrer nom',
    },
    operationDescription: {
      de: 'Beschreibung',
      en: 'Description',
      fr: 'Description',
    },
    enterDescription: {
      de: 'Beschreibung eingeben',
      en: 'Enter description',
      fr: 'Entrer description',
    },
    eventState: {
      de: 'Situationslage',
      en: 'Event state',
      fr: 'Situation',
    },
    importScenario: {
      de: 'Ereignis importieren',
      en: 'Import Scenario',
      fr: 'Importer événement',
    },
    import: {
      de: 'Importieren',
      en: 'Import',
      fr: 'Importer',
    },
    showArchivedScenarios: {
      de: 'Archivierte Ereignise anzeigen',
      en: 'View archived events',
      fr: 'Afficher les événements archivés',
    },
    showActiveScenarios: {
      de: 'Aktive Ereignise anzeigen',
      en: 'Show active events',
      fr: 'Afficher les événements actifs',
    },
    localOperation: {
      de: 'Ereignis nur lokal verfügbar',
      en: 'Scenario available locally only',
      fr: 'Événement disponible localement uniquement',
    },
    lastModified: {
      de: 'Zuletzt geändert:',
      en: 'Last modified:',
      fr: 'Dernière modification:',
    },
    renameOperation: {
      de: 'Ereignis umbenennen',
      en: 'Rename event',
      fr: 'Renommer événement',
    },
    exportOperation: {
      de: 'Ereignis exportieren',
      en: 'Export event',
      fr: 'Exporter événement',
    },
    archiveOperation: {
      de: 'Ereignis Archivieren',
      en: 'Archive event',
      fr: 'Archiver événement',
    },
    unarchiveOperation: {
      de: 'Ereignis wiederherstellen',
      en: 'Unarchive event',
      fr: 'Désarchiver événement',
    },
    deleteOperation: {
      de: 'Ereignis löschen',
      en: 'Delete event',
      fr: 'Supprimer événement',
    },
    deleteOperationConfirm: {
      de: 'Möchten Sie dieses Ereignis wirklich unwiderruflich löschen?',
      en: 'Do you really want to permanently delete this event?',
      fr: 'Voulez-vous vraiment supprimer définitivement cet événement ?',
    },

    //Please do NOT add new textes here, add to corresponding file/place

    ...SIDEBAR_TRANSLATIONS,
    ...MAP_TRANSLATIONS,
    ...LAYER_TRANSLATIONS,
    ...JOURNAL_TRANSLATIONS,
    ...DOCUMENTATION_TRANSLATIONS,
    ...RESOURCE_TRANSLATIONS,
  };

  public get(key: string): string {
    if (!key?.trim()) {
      console.warn('Empty translation key provided');
      return '';
    }

    const element = I18NService.TRANSLATIONS[key];
    if (!element) {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }

    return this.getFallbackTranslation(element, key);
  }

  public getLabelForSign(sign: Sign): string {
    return this.getFallbackSignTranslation(sign);
  }

  public has(key: string): boolean {
    const element = I18NService.TRANSLATIONS[key];
    if (!element) return false;

    return this.getFallbackTranslation(element) !== '';
  }

  // Private helper methods
  private getFallbackTranslation(translations: Record<string, string>, key?: string): string {
    const userLocale = this._session.getLocale();
    const preferred = translations[userLocale];

    if (preferred) return preferred;

    // Log when user's preferred locale is missing
    const keyInfo = key ? ` for key '${key}'` : '';
    console.warn(`Translation missing${keyInfo} for user locale '${userLocale}'`);

    for (const locale of LOCALES) {
      if (translations[locale]) return translations[locale];
    }
    return '';
  }

  private getFallbackSignTranslation(sign: Sign): string {
    const userLocale = this._session.getLocale();
    const preferred = sign[userLocale];

    if (preferred) return preferred;

    console.warn(`Sign translation missing for user locale '${userLocale}'`);

    for (const locale of LOCALES) {
      if (sign[locale]) return sign[locale];
    }
    return '';
  }
}
