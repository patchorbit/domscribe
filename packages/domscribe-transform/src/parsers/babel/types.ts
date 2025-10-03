import { ParserPlugin } from '@babel/parser';

export interface BabelParserOptions {
  typescript?: boolean;
  jsx?: boolean;
  plugins?: ParserPlugin[];
}
