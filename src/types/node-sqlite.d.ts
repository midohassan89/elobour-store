declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    get(...params: Array<string | number | bigint | null>): unknown;
    run(...params: Array<string | number | bigint | null>): unknown;
  }
}
