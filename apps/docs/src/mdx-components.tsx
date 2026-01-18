import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import {
  APIReference,
  APIMethod,
  APIMethodContent,
  APIMethodLeft,
  APIMethodRight,
  APIDescription,
  APIParameters,
  APIParam,
  APIReturns,
  APISignature,
  APIExamples,
  APIProperty,
} from './components/api-reference';
import { CodeShowcase, CodeFile } from './components/landing/code-showcase';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // API Reference components
    APIReference,
    APIMethod,
    APIMethodContent,
    APIMethodLeft,
    APIMethodRight,
    APIDescription,
    APIParameters,
    APIParam,
    APIReturns,
    APISignature,
    APIExamples,
    APIProperty,
    ...components,
    CodeShowcase,
    CodeFile,
  };
}
