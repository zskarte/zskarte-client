import { Injectable } from '@angular/core';
import { Sign } from '../core/entity/sign';
import { SessionService } from '../session/session.service';

export type Locale = 'de' | 'fr' | 'en';
export const LOCALES: Locale[] = ['de', 'fr', 'en'];
export const DEFAULT_LOCALE: Locale = LOCALES[0];

@Injectable({
  providedIn: 'root',
})
export class I18NService {
  constructor(private _session: SessionService) {}
  private static TRANSLATIONS = {
    de: {
      de: 'Deutsch',
      en: 'German',
      fr: 'Allemand',
    },
    fr: {
      de: 'Französisch',
      en: 'French',
      fr: 'Francais',
    },
    en: {
      de: 'Englisch',
      en: 'English',
      fr: 'Anglais',
    },
    language: {
      de: 'Sprache',
      en: 'Language',
      fr: 'Langue',
    },
    symbol: {
      de: 'Symbol',
      en: 'Symbol',
      fr: 'Symbole',
    },
    name: {
      de: 'Name',
      en: 'Name',
      fr: 'Nom',
    },
    distance: {
      de: 'Distanz',
      en: 'Distance',
      fr: 'Distance',
    },
    area: {
      de: 'Fläche',
      en: 'Area',
      fr: 'Région',
    },
    password: {
      de: 'Passwort',
      fr: 'Mot de passe',
      en: 'Password',
    },
    wrongPassword: {
      de: 'Ungültiges Passwort',
      fr: 'Mauvais mot de passe',
      en: 'Wrong password',
    },
    eventname: {
      de: 'Ereignis',
      fr: "L'événement",
      en: 'Happening',
    },
    mapDataOvertake: {
      de: 'Kartendaten übernehmen',
      fr: 'Appliquer les données de la carte',
      en: 'Overtake map data',
    },
    sessionOverdue: {
      de: 'Abgelaufen',
      fr: 'Expired',
      en: 'Expiré',
    },
    text: {
      de: 'Text',
      en: 'Text',
      fr: 'Texte',
    },
    draw: {
      de: 'Zeichnen',
      fr: 'Dessiner',
      en: 'Draw',
    },
    createOrLoad: {
      de: 'Sitzung erstellen / laden',
      en: 'Create / load session',
      fr: 'Créer / charger session',
    },
    newMap: {
      de: 'Neue Karte erstellen',
      en: 'Create new map',
      fr: 'Créer une nouvelle carte',
    },
    loadMap: {
      de: 'Bestehende Karte laden',
      en: 'Load existing map',
      fr: 'Charger une carte existante',
    },
    copy: {
      de: 'Kopie',
      fr: 'Copie',
      en: 'Copy',
    },
    importMap: {
      de: 'Karte importieren',
      en: 'Import map',
      fr: 'Importer carte',
    },
    importMapConflict: {
      de: 'Die zu importierende Karte existiert bereits. Möchten Sie sie ersetzen? Ansonsten wird eine Kopie angelegt.',
      fr: 'La carte à importer existe déjà. Souhaitez-vous le remplacer ? Sinon, une copie est créée.',
      en: 'The map to be imported already exists. Do you want to replace it? If not, a copy will be created.',
    },
    deleteMap: {
      de: 'Karte leeren',
      en: 'Clear map',
      fr: 'Vide la carte',
    },
    confirmDeleteMap: {
      de: 'Wollen Sie diese Karte wirklich unwiederruflich löschen?',
      en: 'Do you really want to delete this card irrevocably?',
      fr: 'Voulez-vous vraiment supprimer cette carte de façon irrévocable ?',
    },
    editMap: {
      de: 'Sitzung bearbeiten',
      en: 'Edit session',
      fr: 'Modifier session',
    },
    downloadCurrentDrawing: {
      de: 'Aktuelle Zeichnung herunterladen',
      fr: 'Télécharger le dessin actuel',
      en: 'Download the current drawing',
    },
    exportSession: {
      de: 'Sitzung exportieren',
      en: 'Export session',
      fr: 'Exporter la session',
    },
    withHistory: {
      de: 'Mit History',
      en: 'With history',
      fr: 'Avec historique',
    },
    withoutHistory: {
      de: 'Ohne History',
      en: 'Without history',
      fr: 'Sans historique',
    },
    cancel: {
      de: 'Abbrechen',
      en: 'Cancel',
      fr: 'Annuler',
    },
    download: {
      de: 'Herunterladen',
      en: 'Download',
      fr: 'Télécharger',
    },
    downloadMap: {
      de: 'Karte herunterladen',
      en: 'Download map',
      fr: 'Télécharger carte',
    },
    downloadMapCSV: {
      de: 'Als CSV exportieren',
      en: 'Export as CSV',
      fr: 'Exporter a CSV',
    },
    filter: {
      de: 'Filter',
      en: 'Filter',
      fr: 'Filtre',
    },
    filterByCategory: {
      de: 'Nach Kategorie filtern',
      en: 'Filter by category',
      fr: 'Filtrer par catégorie',
    },
    polygon: {
      de: 'Polygon',
      en: 'Polygon',
      fr: 'Polygone',
    },
    point: {
      de: 'Punkt',
      en: 'Point',
      fr: 'Point',
    },
    circle: {
      de: 'Kreis',
      en: 'Circle',
      fr: 'Cercle',
    },
    line: {
      de: 'Linie',
      en: 'Line',
      fr: 'Ligne',
    },
    freehand: {
      de: 'Freihand',
      en: 'Draw free',
      fr: 'Dessiner libre',
    },
    noFilter: {
      de: 'Kein Filter',
      en: 'No filter',
      fr: 'Pas de filtre',
    },
    damage: {
      de: 'Beschädigung',
      en: 'Damage',
      fr: 'Dommage',
    },
    danger: {
      de: 'Gefahr',
      en: 'Danger',
      fr: 'Danger',
    },
    effects: {
      de: 'Auswirkungen',
      en: 'Effects',
      fr: 'Effets',
    },
    resources: {
      de: 'Einsatzmittel',
      en: 'Resources',
      fr: 'Moyens',
    },
    findPlace: {
      de: 'Ort finden',
      fr: 'Trouver emplacement',
      en: 'Find a place',
    },
    endHistoryMode: {
      de: 'History-Modus beenden',
      fr: 'Quitter le mode historique',
      en: 'End history mode',
    },
    loadFromFile: {
      de: 'Von Datei laden',
      fr: 'Charger à partir du fichier',
      en: 'Load from file',
    },
    import: {
      de: 'Importieren',
      fr: 'Importer',
      en: 'Import',
    },
    drawLayer: {
      de: 'Zeichnungsebene',
      fr: 'Couche de dessin',
      en: 'Drawing layer',
    },
    layers: {
      de: 'Ebenen',
      fr: 'Couches cartographiques',
      en: 'Layers',
    },
    rotate: {
      de: 'Rotieren',
      fr: 'Tourner',
      en: 'Rotate',
    },
    opacity: {
      de: 'Deckkraft',
      fr: 'Opacité',
      en: 'Opacity',
    },
    solidLine: {
      de: 'Durchgezogen',
      fr: 'Continue',
      en: 'Solid',
    },
    dottedLine: {
      de: 'Gepunktet',
      en: 'Dotted',
      fr: 'Pointé',
    },
    dashedLine: {
      de: 'Gestrichelt',
      en: 'Dashed',
      fr: 'Pointillée',
    },
    thinDashedLine: {
      de: 'Gestrichelt (Dünn)',
      en: 'Dashed (thin)',
      fr: 'Pointillée (maigrir)',
    },
    lineWidth: {
      de: 'Linien-Dicke',
      en: 'Line width',
      fr: 'Largeur de ligne',
    },
    delete: {
      de: 'Löschen',
      en: 'Delete',
      fr: 'Effacer',
    },
    ok: {
      de: 'OK',
      en: 'OK',
      fr: 'OK',
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
    yourText: {
      de: 'Ihr Text',
      fr: 'Votre texte',
      en: 'Your text',
    },
    drawing: {
      de: 'Zeichnung',
      fr: 'Dessin',
      en: 'Drawing',
    },
    currentDrawing: {
      de: 'Aktuelle Zeichnung',
      fr: 'Dessin actuel',
      en: 'Current drawing',
    },
    history: {
      de: 'History- / Lese-Modus',
      fr: 'Mode historique / lecture',
      en: 'History / read mode',
    },
    drawMode: {
      de: 'Zeichnungsmodus',
      fr: 'Mode de dessin',
      en: 'Drawing mode',
    },
    color: {
      de: 'Farbe',
      fr: 'Couleur',
      en: 'Color',
    },
    colorPickerMode: {
      de: 'Farbauswahlmodus',
      fr: 'Mode sélecteur de couleurs',
      en: 'Color picker mode',
    },
    drawHole: {
      de: 'Loch zeichnen',
      fr: 'Dessiner un trou',
      en: 'Draw a hole',
    },
    moveToTop: {
      de: 'In den Vordergrund',
      en: 'Send to front',
      fr: 'Passer au premier plan',
    },
    moveToBottom: {
      de: 'In den Hintergrund',
      en: 'Send to back',
      fr: 'Passer au fond',
    },
    chooseGroupingArea: {
      de: 'Zu gruppierende Fläche auswählen',
      en: 'Choose the element to group with',
      fr: 'Sélectionnez la zone à grouper',
    },
    ungroup: {
      de: 'Gruppierung aufheben',
      fr: 'Dégrouper',
      en: 'Ungroup',
    },
    group: {
      de: 'Gruppieren',
      fr: 'Grouper',
      en: 'Group',
    },
    cancelGrouping: {
      de: 'Gruppieren abbrechen',
      fr: 'Annuler le groupement',
      en: 'Cancel grouping',
    },
    sessionCreatorTitle: {
      de: 'Willkommen bei Zivilschutz-Karte!',
      fr: 'Bienvenue à Zivilschutz-Karte!',
      en: 'Welcome to Zivilschutz-Karte!',
    },
    sessionCreatorInstructions: {
      de: 'Bitte beachten Sie: Die Daten werden nur auf Ihrem Browser gehalten - sie werden nicht mit einem Server geteilt! Falls Sie die Karte mit anderen zusätzlich sichern oder teilen möchten, können Sie diese exportieren (und erneut importieren).<br/><br/> <strong>Wichtig</strong>: Wenn Sie Ihre Browserdaten löschen, so werden auch die gespeicherten Karten entfernt!',
      fr: "Remarque : les données sont uniquement conservées sur votre navigateur - elles ne sont pas partagées avec un serveur ! Si vous souhaitez enregistrer ou partager la carte avec d'autres personnes, vous pouvez exporter (et réimporter) la carte. <br/><br/><strong>Important</strong>: Si vous supprimez les données de votre navigateur, les cartes enregistrées seront également supprimées.",
      en: 'Please note: The data is only kept in your browser - it is not shared with a server! If you would like to additionally save or share the map with others, you can export (and re-import) the map.<br/><br/> <strong>Important</strong>: If you delete your browser data, the saved maps will also be removed',
    },
    zso: {
      de: 'ZSO',
      fr: 'PCi',
      en: 'CPO',
    },
    sessionLoaderInstructions: {
      de: 'Bitte beachten Sie: Wenn Sie eine Karte laden wird die bestehende nicht gelöscht - Sie können diese jederzeit hier wieder laden.',
      fr: "Remarque : lorsque vous chargez une carte, la carte existante n'est pas supprimée - vous pouvez la recharger ici à tout moment.",
      en: 'Please note: When you load a map, the existing map is not deleted - you can reload it here at any time.',
    },
    importSessionInstructions: {
      de: 'Verwenden Sie eine <strong>.zsjson</strong> Datei um eine vollständige Karte zu importieren.',
      fr: 'Utilisez un fichier <strong>.zsjson</strong> pour importer une carte complète.',
      en: 'Use a <strong>.zsjson</strong> file to import a complete map.',
    },
    confirmClearDrawing: {
      de: 'Wollen Sie wirklich alle Elemente der Zeichnung entfernen? Die History der Karte bleibt dabei bestehen!',
      en: 'Do you really want to clear all elements of this drawing? The history of the map will remain!',
      fr: "Voulez-vous vraiment supprimer tous les éléments du dessin ? L'histoire de la carte restera !",
    },
    confirmImportDrawing: {
      de: 'Wollen Sie die entsprechende Zeichnung wirklich importieren? Die aktuelle Zeichnung wird dabei ersetzt, die History bleibt aber bestehen!',
      en: 'Do you really want to import this drawing? The current drawing will be replaced - the history of the map will remain though!',
      fr: "Voulez-vous vraiment importer le dessin correspondant ? Le dessin actuel sera remplacé, mais l'histoire restera !",
    },
    confirmImportDrawingNoReplace: {
      de: 'Wollen Sie die entsprechende Zeichnung wirklich importieren? Die aktuelle Zeichnung wird dabei mit den enthaltenen Elementen ergänzt!',
      en: 'Do you really want to import the corresponding drawing? The current drawing will be extended with the contained elements!',
      fr: 'Voulez-vous vraiment importer le dessin correspondant ? Le dessin actuel sera étendu avec les éléments contenus !',
    },
    availableLayers: {
      de: 'Verfügbare Ebenen',
      en: 'Available layers',
      fr: 'Couches cartographiques disponibles',
    },
    currentMap: {
      de: 'Basiskarten',
      fr: 'Carte de base',
      en: 'Base map',
    },
    otherMaps: {
      de: 'Andere Karten',
      fr: 'Autre cartes',
      en: 'Other map',
    },
    map: {
      de: 'Karte',
      fr: 'Carte',
      en: 'Map',
    },
    legendNotLoaded: {
      de: 'Die Legende für diese Karte konnte leider nicht geladen werden',
      fr: "La légende de cette carte n'a pas pu être chargée",
      en: 'The legend for this map could not be loaded',
    },
    fontSize: {
      de: 'Schriftgrösse',
      fr: 'Taille de police',
      en: 'Font size',
    },
    yourTag: {
      de: 'Ihr Tag',
      fr: 'Votre tag',
      en: 'Your tag',
    },
    tagState: {
      de: 'Taggen',
      en: 'Tag',
      fr: 'Taguer',
    },
    filterHistory: {
      de: 'Gefiltert (nur markierte / alle 30 min)',
      fr: 'Filtré (uniquement marqué / toutes les 30 min)',
      en: 'Filtered (tagged / every 30 mins only)',
    },
    removeTag: {
      de: 'Tag entfernen',
      fr: 'Supprimer le tag',
      en: 'Remove tag',
    },
    fillPattern: {
      de: 'Muster',
      en: 'Pattern',
      fr: 'Modèle',
    },
    filled: {
      de: 'Gefüllt',
      en: 'Filled',
      fr: 'Rempli',
    },
    hatched: {
      de: 'Schraffiert',
      en: 'Hatched',
      fr: 'Hachuré',
    },
    crossed: {
      de: 'Gekreuzt',
      en: 'Crossed',
      fr: 'Croisé',
    },
    spacing: {
      de: 'Abstand',
      en: 'Spacing',
      fr: 'Espacement',
    },
    angle: {
      de: 'Winkel',
      en: 'Angle',
      fr: 'Angle',
    },
    type: {
      de: 'Typ',
      en: 'Type',
      fr: 'Type',
    },
    font: {
      de: 'Schrift',
      en: 'Font',
      fr: 'Police',
    },
    width: {
      de: 'Dicke',
      en: 'Width',
      fr: 'Largeur',
    },
    functions: {
      de: 'Funktionen',
      en: 'Functions',
      fr: 'Fonctions',
    },
    hideSymbol: {
      de: 'Symbol auf Karte verstecken',
      en: 'Hide symbol on map',
      fr: 'Cacher le symbole sur la carte',
    },
    lockFeature: {
      de: 'Position fixieren',
      en: 'Fix position',
      fr: 'Fixer la position',
    },
    labelShow: {
      de: 'Namen anzeigen',
      en: 'Show name',
      fr: 'Afficher le nom',
    },
    replaceSymbol: {
      de: 'Ersetzen',
      en: 'Replace',
      fr: 'Remplacer',
    },
    selectSymbol: {
      de: 'Auswählen',
      en: 'Select',
      fr: 'Sélectionner',
    },
    removeSymbol: {
      de: 'Entfernen',
      en: 'Remove',
      fr: 'Supprimer',
    },
    symbolOffset: {
      de: 'Versatz',
      en: 'Offset',
      fr: 'Décalage',
    },
    symbolSize: {
      de: 'Grösse',
      en: 'Size',
      fr: 'Taille',
    },
    symbolAlignRight: {
      de: 'Rechts ausrichten',
      en: 'Align right',
      fr: 'Aligner à droite',
    },
    addSymbol: {
      de: 'Hinzufügen',
      en: 'Add',
      fr: 'Ajouter',
    },
    deleteLastPointOnFeature: {
      de: 'Diese Form besteht aus dem Minimum nötiger Punkte.',
      fr: 'Cette forme consiste en un nombre minimum de points.',
      en: 'This shape consists of a minimal number of points.',
    },
    removeFeatureFromMapConfirm: {
      de: 'Möchten Sie dieses Element wirklich von der Karte entfernen?',
      fr: 'Souhaitez-vous vraiment supprimer cet élément de la carte ?',
      en: 'Do you really want to remove this element from the map?',
    },
    shareWithOtherMaps: {
      de: 'Mit anderen Karten teilen',
      fr: "Partager avec d'autres cartes",
      en: 'Share with other maps',
    },
    keepOriginal: {
      de: 'Original-Bild behalten (grössenreduziert)',
      en: 'Keep original image (reduced in size)',
      fr: "Conserver l'image originale (taille réduite)",
    },
    keepOriginalWarning: {
      de: 'Vorsicht: Die Einbettung von zahlreichen Original-Bildern kann die Performanz der Applikation aufgrund der zusätzlichen Datenmenge einschränken!',
      en: 'Caution: The embedding of numerous original images can limit the performance of the application due to the additional data volume!',
      fr: "Attention : l'intégration de nombreuses images originales peut limiter les performances de l'application en raison du volume de données supplémentaires !",
    },
    german: {
      de: 'Deutsch',
      fr: 'Allemand',
      en: 'German',
    },
    french: {
      de: 'Französisch',
      fr: 'Français',
      en: 'French',
    },
    english: {
      de: 'Englisch',
      fr: 'Anglais',
      en: 'English',
    },
    deleteSymbolConfirm: {
      de: 'Wollen Sie dieses Symbol wirklich löschen?',
      fr: 'Voulez-vous vraiment supprimer ce symbole ?',
      en: 'Do you really want to delete this symbol?',
    },
    defineCoordinates: {
      de: 'Koordinaten definieren',
      en: 'Define coordinates',
      fr: 'Définir les coordonnées',
    },
    replaceByImport: {
      de: 'Existierende Elemente mit Import ersetzen',
      fr: "Remplacer les éléments existants par l'import",
      en: 'Replace existing elements with import',
    },
    importFromFile: {
      de: 'Von Datei',
      en: 'From File',
      fr: 'Du fichier',
    },
    importFromGeoadmin: {
      de: 'Von Geoadmin',
      en: 'From Geoadmin',
      fr: 'De Geoadmin',
    },
    importFromGeoadminDescription: {
      de: 'Um Formen von Geoadmin importieren zu können, benötigen Sie den Layer-Namen (z.B. "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill") sowie einen Suchschlüssel und dessen Wert, nach welchen die Metadaten gefiltert werden (z.B. "kanton" als Schlüssel und "FR" als Wert um alle Gemeinden von Fribourg zu importieren)',
      fr: 'Pour importer des formes de geoadmin, vous avez besoin du nom de la couche (par exemple "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill") ainsi que d\'une clé de recherche et de sa valeur, selon laquelle les métadonnées seront filtrées (par exemple "kanton" comme clé et "FR" comme valeur pour importer toutes les communes de Fribourg)',
      en: 'To import forms of geoadmin, you need the layer name (e.g. "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill") as well as a search key and its value, according to which the metadata will be filtered (e.g. "kanton" as key and "FR" as value to import all communes of Fribourg)',
    },
    geoadminImportLayer: {
      de: 'Layer',
      en: 'Layer',
      fr: 'Couche',
    },
    geoadminImportKey: {
      de: 'Such-Schlüssel',
      en: 'Search key',
      fr: 'Clé de recherche',
    },
    geoadminImportValue: {
      de: 'Wert',
      en: 'Value',
      fr: 'Valeur',
    },
    currentState: {
      de: 'Aktuell',
      en: 'Most recent',
      fr: 'Actuel',
    },
    description: {
      de: 'Beschreibung',
      en: 'Description',
      fr: 'Description',
    },
    arrow: {
      de: 'Pfeil',
      en: 'Arrow',
      fr: 'Flèche',
    },
    none: {
      de: 'Keiner',
      en: 'None',
      fr: 'Aucun',
    },
    thin: {
      de: 'Dünn',
      en: 'Thin',
      fr: 'Fine',
    },
    print: {
      de: 'Drucken',
      en: 'Print',
      fr: 'Imprimer',
    },
    protocol: {
      de: 'Protokoll',
      en: 'Protocol',
      fr: 'Protocole',
    },
    protocolTable: {
      de: 'Tabelle anzeigen',
      en: 'Show Table',
      fr: 'Afficher Tableau',
    },
    save: {
      de: 'Speichern',
      en: 'Save',
      fr: 'Enregistrer',
    },
    images: {
      de: 'Bilder',
      en: 'Images',
      fr: 'Images',
    },
    unknown: {
      de: 'Unbekannt',
      en: 'Unknown',
      fr: 'Inconnu',
    },
    help: {
      de: 'Hilfe',
      en: 'Help',
      fr: 'Aide',
    },
    docWelcomeTitle: {
      de: 'Willkommen!',
      en: 'Welcome!',
      fr: 'Bienvenue !',
    },
    docWelcome: {
      de:
        '<h1>Herzlich Willkommen bei Zivilschutz-Karte</h1>\n' +
        'Sie finden hier einige Informationen zur Verwendung der Applikation. \n\n' +
        'Sie können diesen Schritt selbstverständlich jederzeit überspringen und bei Bedarf über das Hilfe-Menü wieder aufrufen.\n\n' +
        'Wir wünschen Ihnen viel Spass bei der Verwendung!',
      fr:
        '<h1>Bienvenue à Zivilschutz-Karte</h1>\n' +
        "Vous trouverez ici quelques informations sur la manière d'utiliser l'application.\n\n" +
        'Vous pouvez sauter cette étape à tout moment et la rappeler via le menu principal si nécessaire.\n\n' +
        "Nous espérons que vous prendrez plaisir à l'utiliser !",
      en:
        '<h1>Welcome to Zivilschutz-Karte</h1>\n' +
        'You will find here some information on how to use the application. \n\n' +
        'You can skip this step at any time and call it up again via the main menu if required.\n\n' +
        'We hope you enjoy using it!',
    },
    docNewMap: {
      de:
        '<ul>' +
        '<li>Um eine neue Karte zu erstellen, müssen Sie zuerst Ihre Zivilschutz-Organisation definieren (welche bei einem zweiten Mal vorgemerkt wird). Ausserdem sollten Sie Ihre Karte benennen (z.B. anhand des aktuellen Ereignisses).</li>' +
        '<li>Falls bereits Karten bestehen, finden Sie eine entsprechende Möglichkeit, diese zu öffnen</li>' +
        '<li>Falls Sie eine Karte exportiert haben / von jemandem mit dem Dateiformat .zsjson erhalten haben, können Sie diese hier importieren</li>' +
        '</ul>',
      en:
        '<ul>' +
        '<li>To create a new map, you must first define your organisation (which will be memorized for a second time). You should also name your map (e.g. based on the current event).</li>' +
        '<li>If some maps already exist, you will find a menu entry to open them</li>' +
        '<li>If you have exported / received a map from someone with the .zsjson file format, you can import it here</li>' +
        '</ul>',
      fr:
        '<ul>' +
        "<li>Pour créer une nouvelle carte, vous devez d'abord définir votre organisation de protection civile (qui sera reprise une seconde fois). Vous devez également nommer votre carte.</li>" +
        "<li>Si d'autres cartes existent déjà, vous trouverez une zone pour les ouvrir</li>" +
        "<li>Si vous avez exporté / reçu une carte de quelqu'un avec le format de fichier .zsjson, vous pouvez l'importer ici</li>" +
        '</ul>',
    },
    docInitialViewTitle: {
      de: 'Initiale Ansicht',
      en: 'Initial view',
      fr: 'Vue initiale',
    },
    docInitialView: {
      de:
        'Nach dem erstellen / laden / importieren einer neuen Karte befinden Sie sich bei der Initial-Darstellung der Karte.\n' +
        'Sie finden im obersten Bereich folgende Elemente vor:' +
        '<ul>' +
        '<li>Das Logo der gewählten Zivilschutzorganisation inkl. der Sprachwahl.</li>' +
        '<li>Den Kartentitel und das <strong>Hauptmenü</strong> (in blau)</li>' +
        '<li>Die aktuelle Uhrzeit</li>' +
        '<li>Eine Suche (<strong>Ort finden</strong>) um nach einer Adresse oder einem gezeichneten Element zu suchen</li>' +
        '<li>Das Menü <strong>Zeichnen</strong></li>' +
        '<li>Das Menü <strong>Aktuelle Zeichnung</strong></li>' +
        '<li>as Menü <strong>Ebenen</strong></li>' +
        '<li>Den <strong>Modus-Schalter</strong> um vom Zeichnungs- zum History / Lese-Modus zu gelangen</li>' +
        '<li>Einen Knopf um das <strong>Menü zu reduzieren</strong> um den Kartenbereich zu maximieren</li>' +
        '</ul>',
      en:
        'After creating / loading / importing a new map you are at the initial view of the map.\n' +
        'You will find the following elements in the top section:\n' +
        '<ul>' +
        '<li>The logo of the chosen organization including the language choice.</li>' +
        '<li>The map title and <strong>main menu</strong> (in blue)</li>' +
        '<li>The current date and time</li>' +
        '<li>A mechanism (<strong>Find location</strong>) to search for an address or a drawn element</li>' +
        '<li>The <strong>draw</strong> menu</li>' +
        '<li>The menu <strong>current drawing</strong></li>' +
        '<li>The menu <strong>layers</strong></li>' +
        '<li>The <strong>mode switch</strong> to switch from drawing to history / read mode</li>' +
        '<li>A button to reduce the <strong>menu</strong> to maximize the map area</li>' +
        '</ul>',
      fr:
        'Après avoir créé / chargé / importé une nouvelle carte, vous vous trouvez à la vue initiale de la carte.\n' +
        'Vous trouverez les éléments suivants dans la section supérieure:\n' +
        "* Le logo de l'organisation de protection civile y compris le choix de la langue.\n" +
        '<li>Le titre de la carte et <strong>le menu principal</strong> (en bleu)</li>' +
        "* L'heure actuelle\n" +
        '<li>Un élément (<strong>Trouver un lieu</strong>) pour rechercher une adresse ou un élément dessiné</li>' +
        '<li>Le menu <strong>dessiner</strong></li>' +
        'Le menu <strong>dessin actuel</strong>\n' +
        '<li>Le menu <strong>couches cartographiques</strong></li>' +
        "* Le <strong>mode switch</strong> pour passer du dessin à l'histoire / mode lecture\n" +
        '<li>Un bouton pour réduire le <strong>menu</strong> pour maximiser la surface de la carte</li>',
    },
    docMainMenuTitle: {
      de: 'Hauptmenü',
      en: 'Main menu',
      fr: 'Menu principal',
    },
    docMainMenu: {
      de:
        'Das Hauptmenü beinhaltet Funktionen \n' +
        '<li>zum erstellen / laden einer Karte (analog Schritt 2)</li>' +
        '<li>zum editieren / umbenennen der aktuellen Karte</li>' +
        '<li>zum exportieren der aktuellen Karte (mit oder ohne History) - das Ergebnis kann dann z.B. auf einem anderen Browser importiert werden.</li>' +
        '<li>um die Karte zu löschen</li>' +
        '<li>um diese Hilfe aufzurufen</li>',
      en:
        'The main menu contains functions \n' +
        '<li>to create / load a map (step 2)</li>' +
        '<li>to edit / rename the current map</li>' +
        '<li>to export the current map (with or without history) - the result can then be imported e.g. on another machine.</li>' +
        '<li>to erase the map</li>' +
        '<li>to indicate this help</li>',
      fr:
        'Le menu principal contient des fonctions \n' +
        '<li>pour créer / charger une carte</li>' +
        '<li>pour éditer / renommer la carte actuelle</li>' +
        '<li>pour exporter la carte actuelle (avec ou sans historique) - le résultat peut être importé par exemple sur une autre machine.</li>' +
        '<li>pour effacer la carte</li>' +
        '<li>pour indiquer cette aide</li>',
    },
    docSearch: {
      de: 'Die Suche kann dazu verwendet werden, Adressen und andere Orte zu finden und mittels Selektion zum entsprechenden Ort auf der Karte zu navigieren. Die Suche unterstützt ausserdem gezeichnete Symbole inkl. deren Namen',
      en: 'The search can be used to find addresses and other places and navigate to the corresponding location on the map. The search also supports drawn symbols by including their names',
      fr: "La recherche peut être utilisée pour trouver des adresses et d'autres lieux et naviguer jusqu'à l'endroit correspondant sur la carte. La recherche prend également en compte les symboles dessinés, y compris leurs noms",
    },
    docDraw: {
      de:
        'Dieses Menü erlaubt es, verschiedene Elemente auf die Karte zu zeichnen:\n' +
        '<li><strong>Text</strong>: Ein Dialog erscheint, welcher es erlaubt einen Text zu definieren. Nach dem Schliessen des Dialoges kann eine Linie auf die Karte gezeichnet werden indem auf die Karte geklickt wird (beenden mit Doppelklick). Anschliessend wird der Text dargestellt und unten links erscheint die <strong>Selektionsansicht</strong>.</li>' +
        '<li><strong>Symbol</strong>: Es erscheint der <strong>Symbolauswahl</strong> Dialog - nach der entsprechenden Auswahl kann (je nach Symbol) ein Punkt, eine Linie oder eine Fläche (Polygon) gezeichnet werden.</li>' +
        '<li><strong>Polygon</strong>: Es kann direkt begonnen werden, eine Fläche zu zeichnen (bei Bedarf kann auch später über die <strong>Selektionsansicht</strong> ein Symbol definiert werden).</li>' +
        '<li><strong>Linie</strong>: Analog dem Polygon kann direkt begonnen werden, eine Linie zu zeichnen. Eine Linie kann über die <strong>Selektionsansicht</strong> auch in einen Pfeil umgewandelt werden.</li>',
      en:
        'This menu allows you to draw different elements on the map: \n' +
        '<li><strong>Text</strong>: A dialog appears, which allows you to define a text. After closing the dialog, a line can be drawn on the map by clicking on the map (finish by double click). The text is then displayed and the <strong>selection view</strong> is shown.</li>' +
        '<li><strong>Symbol</strong>: The <strong>symbol selection</strong> dialog appears - after the corresponding selection a point, a line or a area (polygon) can be drawn (depending on the symbol).</li>' +
        '<li><strong>Polygon</strong>: You can start drawing a surface directly (if necessary, you can also define a symbol later using the <strong>selection view</strong>).</li>' +
        '<li><strong>Line</strong>: Just as with the polygon, you can directly start drawing a line. A line can also be converted into an arrow using the <strong>selection view</strong>"</li>',
      fr:
        'Ce menu vous permet de dessiner différents éléments sur la carte:\n' +
        '<li><strong>Texte</strong> : Un dialogue apparaît, qui vous permet de définir un texte. Après avoir fermé le dialogue, une ligne peut être tracée sur la carte en cliquant sur la carte (terminer par un double clic). Le texte est alors affiché et la <strong>vue de sélection</strong> apparaît dans le coin inférieur gauche.</li>' +
        '<li><strong>Symbole</strong> : Le dialogue <strong>sélection de symbole</strong> apparaît - après la sélection correspondante, un point, une ligne ou une surface (polygone) peut être dessiné (selon le symbole).</li>' +
        '<li><strong>Polygone</strong> : Vous pouvez commencer à dessiner une surface directement (si nécessaire, vous pouvez également définir un symbole plus tard en utilisant la <strong>vue de sélection</strong>).</li>' +
        '<li><strong>Ligne</strong> : Comme pour le polygone, vous pouvez directement commencer à tracer une ligne. Une ligne peut également être convertie en flèche en utilisant la <strong>vue de sélection</strong></li>',
    },
    docSymbolSelectionTitle: {
      de: 'Symbolauswahl',
      en: 'Symbol selection',
      fr: 'Séléction de symbole',
    },
    docSymbolSelection: {
      de:
        'Die Symbolauswahl erlaubt es, aus vordefinierten Symbolen auszuwählen, oder eigene Symbole über den Knopf neben dem Filter zu definieren.\n\n' +
        'Wurde ein eigenes Symbol hochgeladen, so kann definiert werden, um welche Geometrie es sich handelt (Punkt / Linie / Polygon), es kann eine Benennung in einer oder mehreren der unterstützten Sparchen definiert und eine zugehörige Farbe gewählt werden.\n\n' +
        'Grundsätzlich werden Bilder, welche als Symbole hinzugefügt werden als Kreis ausgeschnitten. Soll das Bild in seiner Originalform für die spätere Detailansicht erhalten bleiben, so kann dies hier selektiert werden. \n\n' +
        'Auch kann ein Symbol für die Verwendung durch andere Karten auf diesem Browser freigegeben werden.',
      en:
        'Symbol selection allows you to choose from predefined symbols, or to define your own symbols using the button next to the filter.\n' +
        'If a custom symbol has been uploaded, you can define the geometry (point / line / polygon), define a name in one or more of the supported languages and choose a color.\n' +
        'By default, images that are added as symbols are cut out as a circle. If you want to keep the picture in its original form for the detail view, you can define this here.\n' +
        'Also, an icon can be shared for use by other maps on this browser.\n',
      fr:
        "La sélection de symboles vous permet de choisir parmi des symboles prédéfinis, ou de définir vos propres symboles à l'aide du bouton situé à côté du filtre.\n" +
        'Si un symbole personnalisé a été téléchargé, vous pouvez définir la géométrie (point / ligne / polygone), définir un nom dans une ou plusieurs des langues supportées et choisir une couleur.\n' +
        "Fondamentalement, les images qui sont ajoutées en tant que symboles sont découpées en forme de cercle. Si vous souhaitez conserver l'image dans sa forme originale pour la vue détaillée, vous pouvez la sélectionner ici.\n" +
        "De plus, une icône peut être partagée pour être utilisée par d'autres cartes sur cette machine.",
    },
    docSelectionTitle: {
      de: 'Selektionsansicht',
      en: 'Selection view',
      fr: 'Vue de la sélection',
    },
    docSelection: {
      de:
        'Wird ein Element auf der Karte selektiert (z.B. ein Symbol, eine Linie, eine Fläche, etc.), so erscheint in der unteren linken Ecke des Bildschirms eine Selektionsansicht.\n\n' +
        'Für alle Elemente sind die folgenden Funktionen vorhanden:\n' +
        '<li>Es kann ein Name angegeben werden (u.a. um nach dem gezeichneten Element zu suchen)</li>' +
        '<li>Es kann eine Farbe definiert werden</li>' +
        '<li>Die Position kann fixiert werden (solange dies aktiviert ist, ist es nicht möglich das Element zu verschieben oder seine Geometrie zu ändern).</li>' +
        '<li>Unter "Funktionen" kann ein Element in den Vordergrund oder Hintergrund gebracht werden und die Koordinaten des Elements können manuell definiert werden.</li>' +
        '<li>Das Element kann gelöscht werden.\n</li>' +
        'Zusätzlich unterscheiden sich einige Optionen je nach gewählter Geometrie:\n' +
        '<li><strong>Text</strong>: Die Schriftgrösse kann definiert werden</li>' +
        '<li><strong>Linie</strong>: Die Linie kann als gestrichelt oder durchgängig definiert und die Liniendicke und ein Pfeilende angegeben werden</li>' +
        '<li><strong>Polygon</strong>: </li>' +
        '   * Es kann - neben der Möglichkeit die Linie als gestrichelt oder durchgängig sowie deren Dicke zu definieren - ein Muster sowie die Transparenz angegben werden, welches zum Füllen der Fläche verwendet werden soll.\n' +
        '   * Es kann ein Loch in ein Polygon gezeichnet werden\n' +
        '   * Polygone können zusammen gruppiert werden (z.B. um unzusammenhängende Bereiche zu vereinen)\n' +
        '<li><strong>Alle ausser Text</strong>: </li>' +
        '   * Es kann eine Beschreibung definiert werden indem Bilder (existierende oder selbstgewählte Symbole - ein Klick auf das Bild öffnet die Detailansicht) und/oder Text.\n' +
        '   * Symbole können definiert / ersetzt / ausgeblendet / vergrössert / verkleinert und gedreht werden und es ist möglich, die Darstellung des Symbols zur besseren Sichtbarkeit vom Ankerpunkt aus zu verschieben',
      en:
        'If an element on the map is selected (e.g. a symbol, a line, an area, etc.), a selection view appears in the lower left corner of the screen.\n\n' +
        'The following functions are available for all elements:\n' +
        '<li>A name can be specified (e.g. to allow the search for the drawn element)</li>' +
        '<li>A color can be defined</li>' +
        '<li>The position can be fixed (if this is activated, it is not possible to move the element or change its geometry).</li>' +
        '<li>Under "Functions" an element can be brought into the foreground or background and the coordinates of the element can be defined manually.</li>' +
        '<li>The item can be deleted. \n</li>' +
        'In addition, some options differ depending on the selected geometry:\n' +
        '<li><strong>Text</strong>: The font size can be defined</li>' +
        '<li><strong>Line</strong>: The line can be defined as dashed or continuous. The line thickness can be changed and an arrow end can be specified</li>' +
        '<li><strong>Polygon</strong>: </li>' +
        '   * In addition to the option of defining the line as dashed or continuous and its thickness, you can also specify a pattern and the transparency to be used to fill the area. \n ' +
        '   * A hole can be drawn in a polygon\n' +
        '   * Polygons can be grouped together (e.g. to combine unconnected areas)\n ' +
        '<li><strong>All except text</strong> </li>' +
        '   * A description can be defined by images (existing or self-selected symbols - a click on the image opens the detail view) and/or text.\n' +
        '   * Symbols can be defined / replaced / hidden / resized and rotated and it is possible to "move" the representation of the symbol from the anchor point for better visibility',
      fr:
        "Si un élément de la carte est sélectionné (par exemple, un symbole, une ligne, une zone, etc.), une vue de sélection apparaît dans le coin inférieur gauche de l'écran.\n" +
        'Pour tous les éléments, les fonctions suivants sont disponibles:\n' +
        "* Un nom peut être spécifié (entre autres pour rechercher l'élément dessiné)\n" +
        '<li>Une couleur peut être définie</li>' +
        "* La position peut être fixée (tant qu'elle est activée, il n'est pas possible de déplacer l'élément ou de modifier sa géométrie).\n" +
        '<li>Sous "Fonctions", un élément peut être mis au premier plan ou à l\'arrière-plan et les coordonnées de l\'élément peuvent être définies manuellement.</li>' +
        "* L'élément peut être supprimé.\n" +
        'En outre, certaines options diffèrent en fonction de la géométrie choisie:\n' +
        '<li><strong>Texte</strong> : La taille de la police peut être définie</li>' +
        "* <strong>Ligne</strong> : La ligne peut être définie comme pointillée ou continue. L'épaisseur de la ligne peut être modifiée et une extrémité de flèche peut être spécifiée\n" +
        '<li><strong>Polygone</strong> : </li>' +
        '   * En plus de la possibilité de définir la ligne comme pointillée ou continue et son épaisseur, vous pouvez également spécifier un motif et la transparence à utiliser pour remplir le polygone.\n' +
        '   * Un trou peut être dessiné dans un polygone\\n" +\n' +
        '   * Les polygones peuvent être regroupés (par exemple pour combiner des zones non connectées)\n' +
        '<li><strong>Tout sauf le texte</strong></li>' +
        "   * Une description peut être définie par des images (symboles existants ou sélectionnés - un clic sur l'image ouvre la vue détaillée) et/ou du texte.\n" +
        '   * Les symboles peuvent être définis / remplacés / cachés / zoomés / dézoomés et pivotés et il est possible de "déplacer" la représentation du symbole à partir du point d\'ancrage pour une meilleure visibilité',
    },
    docFilter: {
      de: 'Der Filter erlaubt es, einzelne Symbole oder alle (Symbol: durchgestrichenes Auge) auszublenden, resp. einzublenden (Symbol: Auge)',
      en: 'The filter allows you to hide or show individual or all symbols',
      fr: "Le filtre vous permet de cacher ou d'afficher des symboles individuels ou tous",
    },
    docCurrentDrawing: {
      de:
        'Dieses Menü beinhaltet die Möglichkeiten:\n' +
        '<li>Zeichnungen / Geometrien von einer Datei oder von einem Geoadmin-Layer (z.B. Gemeindegrenzen) zu importieren (es handelt sich dabei ausschliesslich um die gezeichneten Elemente - nicht um die History o.ä.). Soll eine Karte komplett importiert werden, so soll die Möglichkeit des Karten ladens im <strong>Hauptmenü</strong> verwendet werden.</li>' +
        '<li>Die Zeichnung herunterzuladen (im geojson Format)</li>' +
        '<li>Die Zeichnung zu taggen (dem aktuellen Stand einen Namen zu geben um diesen dann im <strong>History- / Lese-Modus</strong> wiederfinden zu können)</li>' +
        '<li>Die Zeichnung zu drucken</li>' +
        '<li>Die gezeichneten Elemente zu löschen</li>',
      en:
        'This menu contains the options:\n' +
        '<li>import drawings / geometries from a file or from a geoadmin layer (e.g. municipal boundaries) (only the drawn elements are imported - not the history or similar). If a map is to be imported completely, the option to load maps in the <strong>main menu</strong> should be used.</li>' +
        '<li>To download the drawing (in geojson format)</li>' +
        '<li>To tag the drawing (give a name to the current state to be able to find it again in <strong>history / read mode</strong>)</li>' +
        '<li>To print the drawing</li>' +
        '<li>To delete the drawn elements</li>',
      fr:
        'Ce menu contient les options suivantes:\n' +
        "* importer des dessins / géométries à partir d'un fichier ou d'une couche géoadmin (par exemple, les limites municipales) (seuls les éléments dessinés sont importés - pas l'historique ou similaire). Si une carte doit être importée complètement, il faut utiliser l'option de chargement des cartes dans le <strong>menu principal</strong>.\n" +
        '<li>Pour télécharger le dessin (au format geojson)</li>' +
        "* Marquer le dessin (donner un nom à l'état actuel pour pouvoir le retrouver en <strong>histoire / mode lecture</strong>)\n" +
        '<li>Pour imprimer le dessin</li>' +
        '<li>Pour supprimer les éléments dessinés</li>',
    },
    docLayers: {
      de:
        'Es können verschiedene Karten gewählt werden (u.a. Open Street Map, Satellitenbilder von GeoAdmin oder die Offline-Variante sofern installiert).\n\n' +
        'Ausserdem kann die Transparenz der aktuellen Karte definiert werden.\n\n' +
        'Zusätzliche Ebenen stammen von GeoAdmin, welche es erlauben die gezeichnete Karte mit spezifischen Themenkarten zu unterlegen',
      fr:
        'Différentes cartes peuvent être sélectionnées (entre autres Open Street Map, des images satellites de GeoAdmin ou la version hors ligne si elle est installée).\n' +
        'Vous pouvez également définir la transparence de la carte actuelle. \n' +
        'Des couches supplémentaires proviennent de GeoAdmin, qui permettent de sous-tendre la carte dessinée avec des cartes thématiques spécifiques',
      en:
        'Different maps can be selected (among others Open Street Map, satellite images from GeoAdmin or the offline version if installed).\n' +
        'You can also define the transparency of the current map. \n' +
        'Additional layers come from GeoAdmin, which allow to underlay the drawn map with specific theme maps\n',
    },
    docHistory: {
      de:
        'Dieser Modus dient dem Lesen / Präsentieren der Karte. Hier werden Symbole gebündelt, sofern die Karte weit ausgezoomt wird. Ausserdem ist es hier möglich, frühere Kartenzustände welche automatisch aufgezeichnet oder explizit durch den Benutzer getagged wurden aufgerufen werden.\n\n' +
        'Bei der Selektion eines Elementes erscheint in der linken unteren Ecke eine Übersicht über die definierten Informationen wie Name, Beschreibung, Bilder, etc.',
      fr:
        "Ce mode permet de lire / présenter la carte. C'est là que les symboles sont regroupés, à condition que la carte soit largement dézoomée. Il est également possible d'appeler des états de carte précédents qui ont été automatiquement enregistrés ou explicitement marqués par l'utilisateur.\n" +
        "Lors de la sélection d'un élément, une vue d'ensemble des informations définies telles que le nom, la description, les images, etc. apparaît dans le coin inférieur gauche\n",
      en:
        'This mode is for reading / presenting the map. This is where symbols are grouped, provided the map is zoomed out widely. It is also possible to call up previous map states which have been automatically recorded or explicitly tagged by the user.\n' +
        'When selecting an element, an overview of the defined information such as name, description, images, etc. appears in the lower left corner\n',
    },
    docOfflineMap: {
      de: "Diese Karte kann nur ausgewählt werden, wenn ein eigener Karten-Server unter '${offlineHost}/' (Statuscode: 200) erreichbar ist. Der Karten-Server kann durch den GET Parameter '&offlineHost=http://localhost:8080' gesetzt werden.",
      fr: "Cette carte ne peut être sélectionnée que si votre propre serveur de carte est disponible sous '${offlineHost}/' (code d'état: 200). Le serveur de carte peut être défini à l'aide du paramètre GET '&offlineHost=http://localhost:8080'.",
      en: "This map can only be selected if your own map server is available under '${offlineHost}/' (status code: 200). The map server can be set using the GET parameter '&offlineHost=http://localhost:8080'.",
    },
    keyboardShortcutsTitle: {
      de: 'Tastenbelegungen',
      en: 'Keyboard shortcuts',
      fr: 'Attributions clés',
    },
    close: {
      de: 'Schliessen',
      en: 'Close',
      fr: 'Conclure',
    },
    keyboardShortcuts: {
      de: 'TBD',
      en: 'TBD',
      fr: 'TBD',
    },
    favoriteLayers: {
      de: 'Favoriten',
      en: 'Favorites',
      fr: 'Favoris',
    },
    noMoreFavorites: {
      de: 'Keine Favoriten mehr vorhanden',
      en: 'No more favorites available',
      fr: 'Pas de favoris',
    },
    freeHand: {
      de: 'Freihand',
      en: 'Free hand',
      fr: 'TBD',
    },
    signPlace: {
      de: 'Einrichtungen',
      en: 'Facilities',
      fr: 'Équipement',
    },
    signFks: {
      de: 'Feuerwehr',
      en: 'Fire department',
      fr: 'Pompiers',
    },
    signAction: {
      de: 'Aktionen',
      en: 'Actions',
      fr: 'Actions',
    },
    signDamage: {
      de: 'Schäden',
      en: 'Damage',
      fr: 'Damage',
    },
    signIncident: {
      de: 'Ereignis',
      en: 'Incident',
      fr: 'Incident',
    },
    signFormation: {
      de: 'Formationen',
      en: 'Formations',
      fr: 'Formations',
    },
    signVehicles: {
      de: 'Fahrzeuge',
      en: 'Vehicles',
      fr: 'Véhicules',
    },
    signEffect: {
      de: 'Auswirkungen',
      en: 'Effects',
      fr: 'Effets',
    },
    signDanger: {
      de: 'Gefahren',
      en: 'Dangers',
      fr: 'Dangers',
    },
    signLabel: {
      de: 'Markierungen',
      en: 'Labels',
      fr: 'Marquages',
    },
    allCategories: {
      de: 'Alle Kategorien',
      en: 'All categories',
      fr: 'Toutes catégories',
    },
    categories: {
      de: 'Kategorien',
      en: 'Categories',
      fr: 'Catégories',
    },
    logout: {
      de: 'Sitzung beenden',
      en: 'End session',
      fr: 'Fin de session',
    },
    expand: {
      de: 'Ansicht wechseln',
      en: 'Change view',
      fr: 'Aligner la vue',
    },
    zoomOut: {
      de: 'Heraus zoomen',
      en: 'Zoom out',
      fr: 'Zoom out',
    },
    zoomIn: {
      de: 'Hinein zoomen',
      en: 'Zoom in',
      fr: 'Zoom in',
    },
    filters: {
      de: 'Filter',
      en: 'Filters',
      fr: 'Filtre',
    },
    generalFilters: {
      de: 'Globale Filter',
      en: 'Global filters',
      fr: 'Filtre globale',
    },
    showAllElements: {
      de: 'Alle Elemente anzeigen',
      en: 'Show all elements',
      fr: 'Afficher tout',
    },
    hideAllElements: {
      de: 'Alle Elemente verstecken',
      en: 'Hide all elements',
      fr: 'Tout cacher',
    },
    hideShow: {
      de: 'anzeigen/verstecken',
      en: 'show/hide',
      fr: 'afficher/cacher',
    },
    csvSearchFor: {
      de: 'Suche nach ...',
      en: 'Search for ...',
      fr: 'Chercher ...',
    },
    csvID: {
      de: 'ID',
      en: 'ID',
      fr: 'ID',
    },
    csvDate: {
      de: 'Erstelldatum',
      en: 'Date created',
      fr: 'Date de creation',
    },
    csvGroup: {
      de: 'Gruppe',
      en: 'Group',
      fr: 'Groupe',
    },
    csvGroupArea: {
      de: 'Bereich',
      en: 'Area',
      fr: 'Zone',
    },
    csvSignatur: {
      de: 'Signatur',
      en: 'Sign',
      fr: 'Signature',
    },
    csvLocation: {
      de: 'Koordinaten',
      en: 'Coordinates',
      fr: 'Coordonnées',
    },
    csvCentroid: {
      de: 'Koordinaten Zentrum',
      en: 'Centroid',
      fr: 'Centre coordonnées',
    },
    csvSize: {
      de: 'Grösse',
      en: 'Size',
      fr: 'Dimension',
    },
    csvLabel: {
      de: 'Bezeichnung',
      en: 'Label',
      fr: 'Désignation',
    },
    csvDescription: {
      de: 'Beschreibung',
      en: 'Description',
      fr: 'Description',
    },
    tooltipSession: {
      de: 'Gültigkeitsdauer Ihrer Gastsitzung',
      en: 'Period of validity of your guest session',
      fr: 'Période de validité de votre session',
    },
    recentlyUsedSigns: {
      de: 'Kürzlich verwendete Signaturen',
      en: 'Recently used signatures',
      fr: 'Signatures récemment utilisées',
    },
  };

  public getLabelForSign(sign: Sign): string {
    const chosenLang = sign[this._session.getLocale()];
    if (chosenLang) {
      return chosenLang;
    } else {
      for (const locale of LOCALES) {
        if (sign[locale]) {
          return sign[locale] ?? '';
        }
      }
    }
    return '';
  }

  public get(key: string): string {
    const element = I18NService.TRANSLATIONS[key];
    if (element) {
      const chosenLang = element[this._session.getLocale()];
      if (chosenLang) {
        return chosenLang;
      } else {
        for (const locale of LOCALES) {
          if (element[locale]) {
            return element[locale];
          }
        }
      }
    }
    throw new Error('Was not able to find an entry in translation table for key ' + key);
  }
  public has(key: string): boolean {
    const element = I18NService.TRANSLATIONS[key];
    if (element) {
      const chosenLang = element[this._session.getLocale()];
      if (chosenLang) {
        return true;
      } else {
        for (const locale of LOCALES) {
          if (element[locale]) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
