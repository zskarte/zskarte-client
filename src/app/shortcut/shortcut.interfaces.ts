export type IShortcut = IShortcutWithInfo | IShortcutWithoutInfo;

interface IBaseShortcut {
  shortcut: string;
  preventDefault?: boolean;
  showOnInfoOverlay?: boolean;
}

interface IShortcutWithInfo extends IBaseShortcut {
  showOnInfoOverlay: true;
  i18nTextKey: string;
}

interface IShortcutWithoutInfo extends IBaseShortcut {
  showOnInfoOverlay?: false;
}
