//resource catalogue (Mittelübersicht) texts
export const RESOURCE_TRANSLATIONS = {
  resourceCatalogue: {
    de: 'Katalog',
    en: 'Catalogue',
    fr: 'Catalogue',
  },
  resourceTabCatalogue: {
    de: 'Katalog',
    en: 'Catalogue',
    fr: 'Catalogue',
  },
  resourceTabDeployed: {
    de: 'Im Einsatz',
    en: 'Deployed',
    fr: 'En engagement',
  },
  resourceTabFormations: {
    de: 'Formationen',
    en: 'Formations',
    fr: 'Formations',
  },
  resourceImportCsv: {
    de: 'CSV importieren',
    en: 'Import CSV',
    fr: 'Importer CSV',
  },
  resourceImportTitle: {
    de: 'Bestand importieren',
    en: 'Import stock',
    fr: 'Importer le stock',
  },
  resourceImportPreviewTitle: {
    de: 'Bestand importieren — Vorschau',
    en: 'Import stock — preview',
    fr: 'Importer le stock — aperçu',
  },
  resourceImportSelectFile: {
    de: 'Datei auswählen',
    en: 'Select file',
    fr: 'Sélectionner un fichier',
  },
  resourceImportRead: {
    de: 'Einlesen',
    en: 'Read file',
    fr: 'Lire le fichier',
  },
  resourceImportReadSummary: {
    de: 'Gelesen',
    en: 'Read',
    fr: 'Lu',
  },
  resourceImportCommit: {
    de: 'Import ausführen',
    en: 'Run import',
    fr: "Exécuter l'import",
  },
  resourceImportHint: {
    de: 'Erwartete Spalten: Artikelnummer, Bezeichnung, Artikelgruppe, Artikeltyp, Status, Seriennummer, Lagerort u.a. gemäss Export des Inventarsystems.',
    en: 'Expected columns: article number, name, article group, article type, status, serial number, storage location, etc. as exported by the inventory system.',
    fr: "Colonnes attendues : numéro d'article, désignation, groupe d'articles, type d'article, statut, numéro de série, emplacement de stockage, etc. selon l'export du système d'inventaire.",
  },
  resourceImportAdded: {
    de: 'Artikel neu',
    en: 'New articles',
    fr: 'Nouveaux articles',
  },
  resourceImportRemoved: {
    de: 'Artikel nicht mehr im Export',
    en: 'Articles no longer in export',
    fr: "Articles absents de l'export",
  },
  resourceImportChanged: {
    de: 'Artikel mit geänderter Stückzahl',
    en: 'Articles with changed quantity',
    fr: 'Articles avec quantité modifiée',
  },
  resourceImportUnchanged: {
    de: 'unverändert',
    en: 'unchanged',
    fr: 'inchangé',
  },
  resourceImportAffected: {
    de: 'zugewiesene Mittel entfallen',
    en: 'assigned resources affected',
    fr: 'ressources attribuées concernées',
  },
  resourceImportAffectedHint: {
    de: 'Diese Mittel bleiben auf der Karte, werden aber als nicht mehr an Lager markiert.',
    en: 'These resources stay on the map but are marked as no longer in stock.',
    fr: "Ces ressources restent sur la carte mais sont marquées comme n'étant plus en stock.",
  },
  resourceImportOrgMismatch: {
    de: 'Die Organisation im Export stimmt nicht mit Ihrer Organisation überein',
    en: 'The organisation in the export does not match your organisation',
    fr: "L'organisation figurant dans l'export ne correspond pas à votre organisation",
  },
  resourceImportNotices: {
    de: 'Hinweise',
    en: 'Notices',
    fr: 'Remarques',
  },
  resourceImportErrors: {
    de: 'Fehler beim Einlesen',
    en: 'Errors while reading',
    fr: 'Erreurs lors de la lecture',
  },
  resourceImportSuccess: {
    de: 'Bestand importiert',
    en: 'Stock imported',
    fr: 'Stock importé',
  },
  resourceClear: {
    de: 'Bestand entfernen',
    en: 'Remove stock',
    fr: "Supprimer l'inventaire",
  },
  resourceClearTitle: {
    de: 'Gesamten Bestand entfernen?',
    en: 'Remove the entire stock?',
    fr: "Supprimer tout l'inventaire ?",
  },
  resourceClearConfirm: {
    de: 'Der gesamte Bestand dieses Ereignisses wird entfernt. Bereits auf der Karte platzierte Mittel bleiben bestehen und werden als "Nicht im Katalog" gekennzeichnet.',
    en: 'The entire stock of this event will be removed. Resources already placed on the map are kept and will be marked as "not in catalogue".',
    fr: "L'ensemble de l'inventaire de cet événement sera supprimé. Les moyens déjà placés sur la carte sont conservés et seront marqués « hors catalogue ».",
  },
  resourceImportOnlineOnly: {
    de: 'Der Import ist nur mit Verbindung zum Server möglich',
    en: 'The import is only possible with a connection to the server',
    fr: "L'import n'est possible qu'avec une connexion au serveur",
  },
  resourceImportRows: {
    de: 'Zeilen',
    en: 'Rows',
    fr: 'Lignes',
  },
  resourceImportArticles: {
    de: 'Artikel',
    en: 'Articles',
    fr: 'Articles',
  },
  resourceImportItems: {
    de: 'Stück',
    en: 'Pieces',
    fr: 'Pièces',
  },
  resourceExportedAt: {
    de: 'Export vom',
    en: 'Exported on',
    fr: 'Exporté le',
  },
  resourceOverviewIntro: {
    de: 'Bestand als CSV importieren: eine Zeile pro Stück, Spalten mit Semikolon getrennt. Stücke mit Seriennummer sind einzeln zuweisbar, alle übrigen zählen als Menge. Danach lassen sich Mittel auf der Karte platzieren und einzelnen Markierungen zuweisen.',
    en: 'Import your stock as CSV: one row per piece, columns separated by semicolons. Pieces with a serial number can be assigned individually, all others count as a quantity. Resources can then be placed on the map and assigned to individual markers.',
    fr: "Importez votre stock au format CSV : une ligne par pièce, colonnes séparées par des points-virgules. Les pièces avec numéro de série s'attribuent individuellement, les autres comptent comme quantité. Les moyens peuvent ensuite être placés sur la carte et attribués à des marqueurs.",
  },
  resourceExampleCsv: {
    de: 'Beispiel-CSV herunterladen',
    en: 'Download example CSV',
    fr: "Télécharger le CSV d'exemple",
  },
  resourceExampleCsvHint: {
    de: 'Die Vorlage enthält alle Pflichtspalten, erklärt sie in den Kopfzeilen und zeigt Beispielzeilen - Beispielzeilen ersetzen, fertig.',
    en: 'The template contains every required column, explains them in its header rows and shows example rows - replace the example rows and you are done.',
    fr: "Le modèle contient toutes les colonnes obligatoires, les explique dans ses en-têtes et montre des lignes d'exemple - remplacez-les et c'est prêt.",
  },
  resourceMarkerResourceCount: {
    de: 'Mittel',
    en: 'Resources',
    fr: 'Moyens',
  },
  resourceMarkerResourcesToggle: {
    de: 'Mittel dieser Markierung anzeigen/ausblenden',
    en: 'Show/hide the resources of this marker',
    fr: 'Afficher/masquer les moyens de ce marqueur',
  },
  resourceLastImport: {
    de: 'Stand',
    en: 'As of',
    fr: 'État au',
  },
  resourceCachedOnly: {
    de: 'Offline — lokal gespeicherter Stand',
    en: 'Offline — locally cached state',
    fr: 'Hors ligne — état enregistré localement',
  },
  resourceSearch: {
    de: 'Suchen',
    en: 'Search',
    fr: 'Rechercher',
  },
  resourceSearchHint: {
    de: 'Artikel, Artikelnummer, Seriennummer',
    en: 'Article, article number, serial number',
    fr: "Article, numéro d'article, numéro de série",
  },
  resourceFilterClear: {
    de: 'Filter leeren',
    en: 'Clear filter',
    fr: 'Réinitialiser le filtre',
  },
  resourceFilterAvailability: {
    de: 'Verfügbarkeit',
    en: 'Availability',
    fr: 'Disponibilité',
  },
  resourceAvailable: {
    de: 'verfügbar',
    en: 'available',
    fr: 'disponible',
  },
  resourceAssigned: {
    de: 'zugewiesen',
    en: 'assigned',
    fr: 'attribué',
  },
  resourceUnavailable: {
    de: 'nicht einsatzbereit',
    en: 'not ready for use',
    fr: 'non disponible',
  },
  resourceCountOf: {
    de: 'von',
    en: 'of',
    fr: 'sur',
  },
  resourceNoFilterResults: {
    de: 'Keine Artikel entsprechen den Filtern',
    en: 'No articles match the filters',
    fr: 'Aucun article ne correspond aux filtres',
  },
  resourceLoadError: {
    de: 'Fehler beim Laden des Bestands',
    en: 'Error loading stock',
    fr: 'Erreur lors du chargement du stock',
  },
  resourceSerialNumberInternal: {
    de: 'Interne Seriennummer',
    en: 'Internal serial number',
    fr: 'Numéro de série interne',
  },
  resourceItemsToggle: {
    de: 'Einzelstücke anzeigen/ausblenden',
    en: 'Show/hide individual pieces',
    fr: 'Afficher/masquer les pièces individuelles',
  },
  resourceSelectArticle: {
    de: 'Artikel auswählen',
    en: 'Select article',
    fr: "Sélectionner l'article",
  },
  resourceSelectAllArticles: {
    de: 'Alle angezeigten Artikel auswählen',
    en: 'Select all shown articles',
    fr: 'Sélectionner tous les articles affichés',
  },
  resourceSelectItem: {
    de: 'Stück auswählen',
    en: 'Select piece',
    fr: 'Sélectionner la pièce',
  },
  resourceQuantityDecrease: {
    de: 'Menge verringern',
    en: 'Decrease quantity',
    fr: 'Diminuer la quantité',
  },
  resourceQuantityIncrease: {
    de: 'Menge erhöhen',
    en: 'Increase quantity',
    fr: 'Augmenter la quantité',
  },
  resourceArticleNumber: {
    de: 'Artikelnummer',
    en: 'Article number',
    fr: "Numéro d'article",
  },
  resourceArticleName: {
    de: 'Artikel',
    en: 'Article',
    fr: 'Article',
  },
  resourceArticleGroup: {
    de: 'Artikelgruppe',
    en: 'Article group',
    fr: "Groupe d'articles",
  },
  resourceArticleType: {
    de: 'Artikeltyp',
    en: 'Article type',
    fr: "Type d'article",
  },
  resourceStorageLocation: {
    de: 'Lagerort',
    en: 'Storage location',
    fr: 'Emplacement de stockage',
  },
  resourceSerialNumber: {
    de: 'Seriennummer',
    en: 'Serial number',
    fr: 'Numéro de série',
  },
  resourceQuantity: {
    de: 'Menge',
    en: 'Quantity',
    fr: 'Quantité',
  },
  resourceTotalCount: {
    de: 'Bestand',
    en: 'Stock',
    fr: 'Stock',
  },
  resourceFreeCount: {
    de: 'Frei',
    en: 'Free',
    fr: 'Libre',
  },
  resourceSelected: {
    de: 'Mittel ausgewählt',
    en: 'Resources selected',
    fr: 'Ressources sélectionnées',
  },
  resourceSelectionClear: {
    de: 'Auswahl leeren',
    en: 'Clear selection',
    fr: 'Effacer la sélection',
  },
  resourceDeploy: {
    de: 'Auf Karte platzieren',
    en: 'Place on map',
    fr: 'Placer sur la carte',
  },
  resourceDeployTitle: {
    de: 'Mittel platzieren',
    en: 'Place resources',
    fr: 'Placer les ressources',
  },
  resourceDeployMode: {
    de: 'Darstellung auf der Karte',
    en: 'Display on the map',
    fr: 'Affichage sur la carte',
  },
  resourceDeployCollection: {
    de: 'Sammel-Standort',
    en: 'Collection location',
    fr: 'Emplacement groupé',
  },
  resourceDeployCollectionHint: {
    de: 'ein Marker für alle Mittel',
    en: 'one marker for all resources',
    fr: 'un marqueur pour toutes les ressources',
  },
  resourceDeploySingle: {
    de: 'Einzeln',
    en: 'Individual',
    fr: 'Individuel',
  },
  resourceDeploySingleHint: {
    de: 'ein Marker pro Mittel',
    en: 'one marker per resource',
    fr: 'un marqueur par ressource',
  },
  resourceDeployName: {
    de: 'Bezeichnung',
    en: 'Label',
    fr: 'Désignation',
  },
  resourceDeploySignature: {
    de: 'Signatur',
    en: 'Signature',
    fr: 'Signature',
  },
  resourceDeployChangeSignature: {
    de: 'Signatur ändern',
    en: 'Change signature',
    fr: 'Modifier la signature',
  },
  resourceDeployMessage: {
    de: 'Meldung',
    en: 'Message',
    fr: 'Message',
  },
  resourceDeployFromJournal: {
    de: 'aus dem Journal übernommen',
    en: 'taken from the journal',
    fr: 'repris du journal',
  },
  resourceDeployOnMap: {
    de: 'Klicken Sie auf die Karte, um die Mittel zu platzieren',
    en: 'Click on the map to place the resources',
    fr: 'Cliquez sur la carte pour placer les ressources',
  },
  resourceDeployAtCenter: {
    de: 'Am Kartenzentrum platzieren',
    en: 'Place at map center',
    fr: 'Placer au centre de la carte',
  },
  resourceDeployLocation: {
    de: 'Ort',
    en: 'Location',
    fr: 'Emplacement',
  },
  resourceDeployLocationSearch: {
    de: 'Adresse oder Koordinaten suchen',
    en: 'Search address or coordinates',
    fr: 'Rechercher une adresse ou des coordonnées',
  },
  resourceDeployLocationChosen: {
    de: 'Gewählter Ort',
    en: 'Chosen location',
    fr: 'Emplacement choisi',
  },
  resourceDeployLocationChange: {
    de: 'Ändern',
    en: 'Change',
    fr: 'Modifier',
  },
  resourceDeployLocationRequired: {
    de: 'Wählen Sie eine Adresse oder Koordinate, oder verwenden Sie eine der Alternativen unten.',
    en: 'Choose an address or coordinate, or use one of the alternatives below.',
    fr: "Choisissez une adresse ou des coordonnées, ou utilisez l'une des alternatives ci-dessous.",
  },
  resourceDeployLocationAlternatives: {
    de: 'Alternativ',
    en: 'Alternatively',
    fr: 'Alternativement',
  },
  resourceDeployAtLocation: {
    de: 'An gewähltem Ort platzieren',
    en: 'Place at chosen location',
    fr: "Placer à l'emplacement choisi",
  },
  resourceNoCatalogue: {
    de: 'Noch kein Bestand geladen',
    en: 'No stock loaded yet',
    fr: "Aucun stock chargé pour l'instant",
  },
  resourceNoCatalogueHint: {
    de: 'Importieren Sie den Materialexport Ihrer Organisation als CSV, um die Mittelübersicht zu nutzen.',
    en: "Import your organisation's material export as CSV to use the resource catalogue.",
    fr: "Importez l'export du matériel de votre organisation au format CSV pour utiliser le catalogue des ressources.",
  },
  resourceAssignedItems: {
    de: 'Zugewiesene Mittel',
    en: 'Assigned resources',
    fr: 'Ressources attribuées',
  },
  resourceAddAssignment: {
    de: 'Mittel hinzufügen',
    en: 'Add resource',
    fr: 'Ajouter une ressource',
  },
  resourceAddAssignmentSearch: {
    de: 'Suchen: Bezeichnung, Artikelnummer, Seriennummer',
    en: 'Search: name, article number, serial number',
    fr: 'Rechercher : désignation, numéro d’article, numéro de série',
  },
  resourceAddAssignmentNoResults: {
    de: 'Keine Mittel gefunden',
    en: 'No resources found',
    fr: 'Aucune ressource trouvée',
  },
  resourceAddAssignmentAvailable: {
    de: 'verfügbar',
    en: 'available',
    fr: 'disponible',
  },
  resourceAddAssignmentDeployed: {
    de: 'bereits im Einsatz',
    en: 'already deployed',
    fr: 'déjà engagée',
  },
  resourceAddAssignmentPieces: {
    de: 'Stück',
    en: 'pcs',
    fr: 'pièces',
  },
  resourceRemoveAssignment: {
    de: 'Mittel entfernen',
    en: 'Remove resource',
    fr: 'Retirer la ressource',
  },
  resourceNoDeployedFilterResults: {
    de: 'Keine Mittel entsprechen den Filtern',
    en: 'No resources match the filters',
    fr: 'Aucun moyen ne correspond aux filtres',
  },
  resourceNoDeployed: {
    de: 'Keine Mittel im Einsatz',
    en: 'No resources deployed',
    fr: 'Aucun moyen engagé',
  },
  resourceNoDeployedHint: {
    de: 'Wählen Sie im Katalog Mittel aus und platzieren Sie sie auf der Karte.',
    en: 'Select resources in the catalogue and place them on the map.',
    fr: 'Sélectionnez des moyens dans le catalogue et placez-les sur la carte.',
  },
  resourceNoFormations: {
    de: 'Keine Formationen vorhanden',
    en: 'No formations available',
    fr: 'Aucune formation disponible',
  },
  resourceNoFormationsHint: {
    de: 'Formationen erscheinen hier, sobald eine Formations-Signatur auf der Karte gesetzt wird.',
    en: 'Formations appear here as soon as a formation signature is placed on the map.',
    fr: 'Les formations apparaissent ici dès quʼune signature de formation est placée sur la carte.',
  },
  resourceOrphanAssignments: {
    de: 'Nicht im Katalog',
    en: 'Not in catalogue',
    fr: 'Absent du catalogue',
  },
  resourceOpenOverview: {
    de: 'Mittelübersicht öffnen',
    en: 'Open resource overview',
    fr: "Ouvrir l'aperçu des ressources",
  },
  resourcePlaceholderSign: {
    de: 'Mittel (aus Mittelübersicht)',
    en: 'Resource (from resource overview)',
    fr: "Ressource (depuis l'aperçu des ressources)",
  },
  resourceDeploySelection: {
    de: 'Auswahl',
    en: 'Selection',
    fr: 'Sélection',
  },
  resourceDeployMessageNone: {
    de: 'Keine',
    en: 'None',
    fr: 'Aucun',
  },
  resourceDeployManyMarkersWarning: {
    de: 'Diese Auswahl erzeugt mehr als 50 einzelne Marker auf der Karte.',
    en: 'This selection creates more than 50 individual markers on the map.',
    fr: 'Cette sélection crée plus de 50 marqueurs individuels sur la carte.',
  },
  resourceTakeBack: {
    de: 'Zurücknehmen',
    en: 'Take back',
    fr: 'Reprendre',
  },
  resourceTakeBackAll: {
    de: 'Alle zurücknehmen',
    en: 'Take all back',
    fr: 'Tout reprendre',
  },
  resourceTakeBackConfirm: {
    de: 'Alle Mittel dieses Markers ins Lager zurücknehmen?',
    en: 'Take all resources of this marker back to stock?',
    fr: 'Reprendre toutes les ressources de ce marqueur en stock ?',
  },
};
