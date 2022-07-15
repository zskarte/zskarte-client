const args = process.argv.slice(1);

export class ArgsHandler {
  public static serve = args.some((val): boolean => val === '--serve');
}
