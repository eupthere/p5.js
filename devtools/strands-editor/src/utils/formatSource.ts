import prettier from 'prettier/standalone';
import babelPlugin from 'prettier/plugins/babel';
import estreePlugin from 'prettier/plugins/estree';

type SourceFormatOptions = {
  parser?: 'babel' | 'typescript';
  semi?: boolean;
  tabWidth?: number;
  useTabs?: boolean;
};

export async function formatSourceCode(
  sourceCode: string,
  options: SourceFormatOptions = {}
) {
  const {
    parser = 'babel',
    semi = true,
    tabWidth = 2,
    useTabs = false,
  } = options;

  return prettier.format(sourceCode, {
    parser,
    plugins: [babelPlugin, estreePlugin],
    semi,
    tabWidth,
    useTabs,
  });
}
