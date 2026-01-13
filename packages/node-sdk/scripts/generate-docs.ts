#!/usr/bin/env npx tsx

/**
 * SDK Documentation Generator
 * 
 * Extracts TSDoc comments from the SDK source and generates MDX files
 * for the Fumadocs documentation site.
 * 
 * Usage:
 *   npx tsx scripts/generate-docs.ts
 *   npm run generate:docs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// Configuration
const SDK_SRC = path.join(__dirname, '../src');
const DOCS_OUTPUT = path.join(__dirname, '../../../apps/docs/content/docs/sdk-reference');

// Types for extracted documentation
interface DocParam {
    name: string;
    type: string;
    description: string;
    optional: boolean;
    defaultValue?: string;
}

interface DocExample {
    title?: string;
    code: string;
}

interface DocMethod {
    name: string;
    signature: string;
    description: string;
    remarks?: string;
    params: DocParam[];
    returns?: { type: string; description: string };
    examples: DocExample[];
    category?: string;
}

interface DocProperty {
    name: string;
    type: string;
    description: string;
    remarks?: string;
    optional: boolean;
    defaultValue?: string;
}

interface DocInterface {
    name: string;
    description: string;
    remarks?: string;
    properties: DocProperty[];
    examples: DocExample[];
    category?: string;
}

interface DocClass {
    name: string;
    description: string;
    remarks?: string;
    constructor?: DocMethod;
    methods: DocMethod[];
    properties: DocProperty[];
    examples: DocExample[];
    category?: string;
}

interface DocFunction {
    name: string;
    signature: string;
    description: string;
    remarks?: string;
    params: DocParam[];
    returns?: { type: string; description: string };
    examples: DocExample[];
    category?: string;
}

interface ExtractedDocs {
    packageDescription: string;
    classes: DocClass[];
    interfaces: DocInterface[];
    functions: DocFunction[];
    types: DocInterface[];
}

// Helper to extract JSDoc comment
function getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string {
    const commentRanges = ts.getLeadingCommentRanges(sourceFile.text, node.pos);
    if (!commentRanges) return '';
    
    for (const range of commentRanges) {
        const comment = sourceFile.text.slice(range.pos, range.end);
        if (comment.startsWith('/**')) {
            return comment;
        }
    }
    return '';
}

// Parse JSDoc tags from comment
function parseJSDoc(comment: string): {
    description: string;
    remarks?: string;
    params: Map<string, string>;
    returns?: string;
    examples: { title?: string; code: string }[];
    defaultValue?: string;
    category?: string;
    see?: string[];
} {
    if (!comment) {
        return { description: '', params: new Map(), examples: [] };
    }

    // Remove /** and */ and clean up
    const lines = comment
        .replace(/^\/\*\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, ''));

    let description = '';
    let remarks = '';
    let returns = '';
    let defaultValue = '';
    let category = '';
    const params = new Map<string, string>();
    const examples: { title?: string; code: string }[] = [];
    const see: string[] = [];

    let currentTag = '';
    let currentContent = '';
    let inExample = false;
    let exampleTitle = '';
    let exampleContent = '';

    for (const line of lines) {
        if (line.startsWith('@')) {
            // Save previous tag content
            if (currentTag === 'remarks') remarks = currentContent.trim();
            if (currentTag === 'returns') returns = currentContent.trim();
            if (currentTag === 'defaultValue') defaultValue = currentContent.trim().replace(/^`|`$/g, '');
            if (currentTag === 'category') category = currentContent.trim();
            if (inExample && exampleContent) {
                // Extract code from code blocks
                let code = exampleContent.trim();
                if (code.startsWith('```')) {
                    code = code.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                }
                examples.push({ title: exampleTitle || undefined, code: code.trim() });
                exampleContent = '';
                exampleTitle = '';
            }
            inExample = false;

            const tagMatch = line.match(/^@(\w+)(?:\s+(.*))?$/);
            if (tagMatch) {
                currentTag = tagMatch[1];
                currentContent = tagMatch[2] || '';

                if (currentTag === 'param') {
                    const paramMatch = currentContent.match(/^(\w+)\s*-?\s*(.*)$/);
                    if (paramMatch) {
                        params.set(paramMatch[1], paramMatch[2]);
                    }
                    currentTag = '';
                } else if (currentTag === 'example') {
                    inExample = true;
                    // Check if the line after @example is a title (not a code block)
                    exampleTitle = currentContent.trim();
                    exampleContent = '';
                } else if (currentTag === 'see') {
                    see.push(currentContent);
                    currentTag = '';
                }
            }
        } else if (inExample) {
            exampleContent += '\n' + line;
        } else if (currentTag) {
            currentContent += '\n' + line;
        } else if (!currentTag && line.trim()) {
            description += (description ? '\n' : '') + line;
        }
    }

    // Save final tag content
    if (currentTag === 'remarks') remarks = currentContent.trim();
    if (currentTag === 'returns') returns = currentContent.trim();
    if (currentTag === 'defaultValue') defaultValue = currentContent.trim().replace(/^`|`$/g, '');
    if (currentTag === 'category') category = currentContent.trim();
    if (inExample && exampleContent) {
        let code = exampleContent.trim();
        if (code.startsWith('```')) {
            code = code.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        }
        examples.push({ title: exampleTitle || undefined, code: code.trim() });
    }

    return { description, remarks, params, returns, examples, defaultValue, category, see };
}

// Get type string from TypeScript node
function getTypeString(node: ts.TypeNode | undefined, sourceFile: ts.SourceFile): string {
    if (!node) return 'unknown';
    return node.getText(sourceFile);
}

// Extract documentation from a source file
function extractFromFile(filePath: string): ExtractedDocs {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        sourceCode,
        ts.ScriptTarget.Latest,
        true
    );

    const docs: ExtractedDocs = {
        packageDescription: '',
        classes: [],
        interfaces: [],
        functions: [],
        types: [],
    };

    // Check for @packageDocumentation
    const fileComment = getJSDocComment(sourceFile, sourceFile);
    if (fileComment.includes('@packageDocumentation')) {
        const parsed = parseJSDoc(fileComment);
        docs.packageDescription = parsed.description;
    }

    function visit(node: ts.Node) {
        const comment = getJSDocComment(node, sourceFile);
        const parsed = parseJSDoc(comment);

        // Skip internal items
        if (comment.includes('@internal')) {
            return;
        }

        if (ts.isClassDeclaration(node) && node.name) {
            const classDoc: DocClass = {
                name: node.name.text,
                description: parsed.description,
                remarks: parsed.remarks,
                methods: [],
                properties: [],
                examples: parsed.examples,
                category: parsed.category,
            };

            for (const member of node.members) {
                const memberComment = getJSDocComment(member, sourceFile);
                if (memberComment.includes('@internal')) continue;
                
                const memberParsed = parseJSDoc(memberComment);

                if (ts.isConstructorDeclaration(member)) {
                    const params: DocParam[] = member.parameters.map(p => ({
                        name: p.name.getText(sourceFile),
                        type: getTypeString(p.type, sourceFile),
                        description: memberParsed.params.get(p.name.getText(sourceFile)) || '',
                        optional: !!p.questionToken || !!p.initializer,
                        defaultValue: p.initializer?.getText(sourceFile),
                    }));

                    classDoc.constructor = {
                        name: 'constructor',
                        signature: `new ${classDoc.name}(${params.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')})`,
                        description: memberParsed.description,
                        params,
                        examples: memberParsed.examples,
                    };
                } else if (ts.isMethodDeclaration(member) && member.name) {
                    const methodName = member.name.getText(sourceFile);
                    if (methodName.startsWith('_')) continue; // Skip private methods

                    const params: DocParam[] = member.parameters.map(p => ({
                        name: p.name.getText(sourceFile),
                        type: getTypeString(p.type, sourceFile),
                        description: memberParsed.params.get(p.name.getText(sourceFile)) || '',
                        optional: !!p.questionToken || !!p.initializer,
                        defaultValue: p.initializer?.getText(sourceFile),
                    }));

                    const returnType = member.type ? getTypeString(member.type, sourceFile) : 'void';

                    classDoc.methods.push({
                        name: methodName,
                        signature: `${methodName}(${params.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')}): ${returnType}`,
                        description: memberParsed.description,
                        remarks: memberParsed.remarks,
                        params,
                        returns: memberParsed.returns ? { type: returnType, description: memberParsed.returns } : undefined,
                        examples: memberParsed.examples,
                    });
                } else if (ts.isPropertyDeclaration(member) && member.name) {
                    const propName = member.name.getText(sourceFile);
                    if (propName.startsWith('_') || member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) continue;

                    classDoc.properties.push({
                        name: propName,
                        type: getTypeString(member.type, sourceFile),
                        description: memberParsed.description,
                        remarks: memberParsed.remarks,
                        optional: !!member.questionToken,
                        defaultValue: memberParsed.defaultValue,
                    });
                }
            }

            docs.classes.push(classDoc);
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
            const interfaceDoc: DocInterface = {
                name: node.name.text,
                description: parsed.description,
                remarks: parsed.remarks,
                properties: [],
                examples: parsed.examples,
                category: parsed.category,
            };

            for (const member of node.members) {
                const memberComment = getJSDocComment(member, sourceFile);
                const memberParsed = parseJSDoc(memberComment);

                if (ts.isPropertySignature(member) && member.name) {
                    interfaceDoc.properties.push({
                        name: member.name.getText(sourceFile),
                        type: getTypeString(member.type, sourceFile),
                        description: memberParsed.description,
                        remarks: memberParsed.remarks,
                        optional: !!member.questionToken,
                        defaultValue: memberParsed.defaultValue,
                    });
                }
            }

            docs.interfaces.push(interfaceDoc);
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            const params: DocParam[] = node.parameters.map(p => ({
                name: p.name.getText(sourceFile),
                type: getTypeString(p.type, sourceFile),
                description: parsed.params.get(p.name.getText(sourceFile)) || '',
                optional: !!p.questionToken || !!p.initializer,
                defaultValue: p.initializer?.getText(sourceFile),
            }));

            const returnType = node.type ? getTypeString(node.type, sourceFile) : 'void';

            docs.functions.push({
                name: node.name.text,
                signature: `${node.name.text}(${params.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')}): ${returnType}`,
                description: parsed.description,
                remarks: parsed.remarks,
                params,
                returns: parsed.returns ? { type: returnType, description: parsed.returns } : undefined,
                examples: parsed.examples,
                category: parsed.category,
            });
        } else if (ts.isVariableStatement(node)) {
            // Handle exported const functions like `export const wideLogger = ...`
            for (const decl of node.declarationList.declarations) {
                if (ts.isIdentifier(decl.name) && decl.initializer && ts.isArrowFunction(decl.initializer)) {
                    const funcComment = getJSDocComment(node, sourceFile);
                    if (funcComment.includes('@internal')) continue;
                    
                    const funcParsed = parseJSDoc(funcComment);
                    const arrow = decl.initializer;

                    const params: DocParam[] = arrow.parameters.map(p => ({
                        name: p.name.getText(sourceFile),
                        type: getTypeString(p.type, sourceFile),
                        description: funcParsed.params.get(p.name.getText(sourceFile)) || '',
                        optional: !!p.questionToken || !!p.initializer,
                    }));

                    const returnType = arrow.type ? getTypeString(arrow.type, sourceFile) : 'void';

                    docs.functions.push({
                        name: decl.name.text,
                        signature: `${decl.name.text}(${params.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')}): ${returnType}`,
                        description: funcParsed.description,
                        remarks: funcParsed.remarks,
                        params,
                        returns: funcParsed.returns ? { type: returnType, description: funcParsed.returns } : undefined,
                        examples: funcParsed.examples,
                        category: funcParsed.category,
                    });
                }
            }
        } else if (ts.isTypeAliasDeclaration(node) && node.name) {
            // Handle type aliases
            const typeDoc: DocInterface = {
                name: node.name.text,
                description: parsed.description,
                remarks: parsed.remarks,
                properties: [],
                examples: parsed.examples,
                category: parsed.category,
            };

            if (ts.isTypeLiteralNode(node.type)) {
                for (const member of node.type.members) {
                    const memberComment = getJSDocComment(member, sourceFile);
                    const memberParsed = parseJSDoc(memberComment);

                    if (ts.isPropertySignature(member) && member.name) {
                        typeDoc.properties.push({
                            name: member.name.getText(sourceFile),
                            type: getTypeString(member.type, sourceFile),
                            description: memberParsed.description,
                            remarks: memberParsed.remarks,
                            optional: !!member.questionToken,
                            defaultValue: memberParsed.defaultValue,
                        });
                    }
                }
            }

            docs.types.push(typeDoc);
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return docs;
}

// Helper to convert {@link Name} to markdown links
function convertJSDocLinks(str: string): string {
    // Map of known symbols to their doc paths
    const linkMap: Record<string, string> = {
        'wideLogger': '/docs/sdk-reference/middleware/widelogger',
        'expressWideLogger': '/docs/sdk-reference/middleware/expresswidelogger',
        'WideEvent': '/docs/sdk-reference/interfaces/wideevent',
        'WideEventBuilder': '/docs/sdk-reference/classes/wideeventbuilder',
        'FullEvent': '/docs/sdk-reference/classes/fullevent',
        'FullEventConfig': '/docs/sdk-reference/interfaces/fulleventconfig',
        'HttpRequestProperties': '/docs/sdk-reference/interfaces/httprequestproperties',
        'SamplingConfig': '/docs/sdk-reference/interfaces/samplingconfig',
        'WideLoggerConfig': '/docs/sdk-reference/interfaces/wideloggerconfig',
        'WideEventVariables': '/docs/sdk-reference/types/wideeventvariables',
    };

    return str.replace(/\{@link\s+(\w+)\}/g, (_, name) => {
        const path = linkMap[name];
        if (path) {
            return `[${name}](${path})`;
        }
        return `\`${name}\``;
    });
}

// Helper to escape JSX special characters
function escapeJSX(str: string): string {
    return str
        .replace(/\{/g, '&#123;')
        .replace(/\}/g, '&#125;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`/g, "'"); // Replace backticks with single quotes for JSX attributes
}

// Helper to format code for JSX (preserve code blocks but escape for JSX)
function formatCodeForJSX(code: string): string {
    return code.replace(/`/g, '\\`');
}

// Helper to clean default value for display (remove backticks)
function cleanDefaultValue(val: string): string {
    return val.replace(/`/g, '').replace(/'/g, '');
}

// Helper to format examples for markdown
function formatExamples(examples: DocExample[]): string {
    return examples.map(ex => {
        let result = '';
        if (ex.title) {
            result += `### ${ex.title}\n\n`;
        }
        result += '```typescript\n' + ex.code + '\n```';
        return result;
    }).join('\n\n');
}

// Generate MDX content for a class (interactive accordion style)
function generateClassMDX(cls: DocClass): string {
    const firstExample = cls.examples[0]?.code || '';
    const description = convertJSDocLinks(cls.description);
    
    let mdx = `---
title: ${cls.name}
description: ${description.split('\n')[0]}
---

# ${cls.name}

${description}

`;

    if (cls.remarks) {
        mdx += `${convertJSDocLinks(cls.remarks)}

`;
    }

    if (cls.examples.length > 0) {
        mdx += `## Usage

${formatExamples(cls.examples)}

`;
    }

    // Methods as accordion
    if (cls.methods.length > 0 || cls.constructor) {
        mdx += `## API Reference

<APIReference>
`;

        // Constructor
        if (cls.constructor) {
            const ctorParams = cls.constructor.params;
            const ctorExample = cls.constructor.examples[0]?.code || `const instance = new ${cls.name}(${ctorParams.map(p => p.name).join(', ')});`;
            
            mdx += `
<APIMethod name="new ${cls.name}(${ctorParams.map(p => p.name).join(', ')})" category="${cls.name}">
<APIMethodContent>
<APIMethodLeft>
<APIDescription>
${cls.constructor.description}
</APIDescription>
${ctorParams.length > 0 ? `
<APIParameters>
${ctorParams.map(p => `<APIParam name="${p.name}" type="${escapeJSX(p.type)}" ${p.optional ? '' : 'required'}${p.defaultValue ? ` defaultValue="${p.defaultValue}"` : ''}>
${p.description}
</APIParam>`).join('\n')}
</APIParameters>
` : ''}
</APIMethodLeft>
<APIMethodRight>
<APISignature>{\`${formatCodeForJSX(cls.constructor.signature)}\`}</APISignature>
<APIExamples>{\`${formatCodeForJSX(ctorExample)}\`}</APIExamples>
</APIMethodRight>
</APIMethodContent>
</APIMethod>
`;
        }

        // Methods
        for (const method of cls.methods) {
            const methodParams = method.params;
            const methodExample = method.examples[0]?.code || `instance.${method.name}(${methodParams.map(p => p.name).join(', ')});`;
            const note = method.remarks ? method.remarks.split('\n')[0] : '';
            
            mdx += `
<APIMethod name="${cls.name.toLowerCase()}.${method.name}(${methodParams.map(p => p.name).join(', ')})" category="${cls.name}">
<APIMethodContent>
<APIMethodLeft>
<APIDescription${note ? ` note="${escapeJSX(note)}"` : ''}>
${method.description}
</APIDescription>
${methodParams.length > 0 ? `
<APIParameters>
${methodParams.map(p => `<APIParam name="${p.name}" type="${escapeJSX(p.type)}" ${p.optional ? '' : 'required'}${p.defaultValue ? ` defaultValue="${p.defaultValue}"` : ''}>
${p.description}
</APIParam>`).join('\n')}
</APIParameters>
` : ''}
${method.returns ? `<APIReturns type="${escapeJSX(method.returns.type)}">${method.returns.description}</APIReturns>` : ''}
</APIMethodLeft>
<APIMethodRight>
<APISignature>{\`${formatCodeForJSX(method.signature)}\`}</APISignature>
<APIExamples>{\`${formatCodeForJSX(methodExample)}\`}</APIExamples>
</APIMethodRight>
</APIMethodContent>
</APIMethod>
`;
        }

        mdx += `
</APIReference>
`;
    }

    return mdx;
}

// Generate MDX content for an interface (interactive style)
function generateInterfaceMDX(iface: DocInterface): string {
    const description = convertJSDocLinks(iface.description);
    
    let mdx = `---
title: ${iface.name}
description: ${description.split('\n')[0] || 'Interface documentation'}
---

# ${iface.name}

${description}

`;

    if (iface.remarks) {
        mdx += `${convertJSDocLinks(iface.remarks)}

`;
    }

    if (iface.examples.length > 0) {
        mdx += `## Usage

${formatExamples(iface.examples)}

`;
    }

    if (iface.properties.length > 0) {
        mdx += `## Properties

<APIReference>
`;

        for (const prop of iface.properties) {
            const propDesc = prop.description || '';
            const cleanedDefault = prop.defaultValue ? cleanDefaultValue(prop.defaultValue) : '';
            
            mdx += `
<APIMethod name="${iface.name}.${prop.name}" category="${iface.name}">
<APIMethodContent>
<APIMethodLeft>
<APIDescription>
${propDesc}
${prop.remarks ? `\n${prop.remarks}` : ''}
</APIDescription>
<APIParameters>
<APIParam name="${prop.name}" type="${escapeJSX(prop.type)}" ${prop.optional ? '' : 'required'}${cleanedDefault ? ` defaultValue="${escapeJSX(cleanedDefault)}"` : ''}>
${propDesc}
</APIParam>
</APIParameters>
</APIMethodLeft>
<APIMethodRight>
<APISignature>{\`${prop.name}${prop.optional ? '?' : ''}: ${escapeJSX(prop.type)}\`}</APISignature>
${cleanedDefault ? `<APIExamples>{\`// Default: ${formatCodeForJSX(cleanedDefault)}\`}</APIExamples>` : ''}
</APIMethodRight>
</APIMethodContent>
</APIMethod>
`;
        }

        mdx += `
</APIReference>
`;
    }

    return mdx;
}

// Generate MDX content for a function (interactive style)
function generateFunctionMDX(func: DocFunction): string {
    const funcExample = func.examples[0]?.code || `${func.name}(${func.params.map(p => p.name).join(', ')});`;
    const description = convertJSDocLinks(func.description);
    const remarks = func.remarks ? convertJSDocLinks(func.remarks) : '';
    const note = remarks ? remarks.split('\n')[0] : '';
    
    let mdx = `---
title: ${func.name}
description: ${description.split('\n')[0]}
---

# ${func.name}

${description}

`;

    if (remarks) {
        mdx += `${remarks}

`;
    }

    mdx += `## API Reference

<APIReference>
<APIMethod name="${func.name}(${func.params.map(p => p.name).join(', ')})" category="Function">
<APIMethodContent>
<APIMethodLeft>
<APIDescription${note ? ` note="${escapeJSX(note)}"` : ''}>
${description}
</APIDescription>
${func.params.length > 0 ? `
<APIParameters>
${func.params.map(p => `<APIParam name="${p.name}" type="${escapeJSX(p.type)}" ${p.optional ? '' : 'required'}${p.defaultValue ? ` defaultValue="${p.defaultValue}"` : ''}>
${p.description}
</APIParam>`).join('\n')}
</APIParameters>
` : ''}
${func.returns ? `<APIReturns type="${escapeJSX(func.returns.type)}">${func.returns.description}</APIReturns>` : ''}
</APIMethodLeft>
<APIMethodRight>
<APISignature>{\`${formatCodeForJSX(func.signature)}\`}</APISignature>
<APIExamples>{\`${formatCodeForJSX(funcExample)}\`}</APIExamples>
</APIMethodRight>
</APIMethodContent>
</APIMethod>
</APIReference>
`;

    // Additional examples if there are more
    if (func.examples.length > 1) {
        mdx += `
## More Examples

${formatExamples(func.examples.slice(1))}
`;
    }

    return mdx;
}

// Main function
async function main() {
    console.log('📚 Generating SDK documentation...\n');

    // Ensure output directory exists
    if (!fs.existsSync(DOCS_OUTPUT)) {
        fs.mkdirSync(DOCS_OUTPUT, { recursive: true });
    }

    // Source files to process
    const sourceFiles = [
        'index.ts',
        'client.ts',
        'builder.ts',
        'middleware/hono.ts',
        'middleware/express.ts',
    ];

    const allDocs: ExtractedDocs = {
        packageDescription: '',
        classes: [],
        interfaces: [],
        functions: [],
        types: [],
    };

    // Extract docs from each file
    for (const file of sourceFiles) {
        const filePath = path.join(SDK_SRC, file);
        if (fs.existsSync(filePath)) {
            console.log(`  Processing ${file}...`);
            const docs = extractFromFile(filePath);
            
            if (docs.packageDescription) allDocs.packageDescription = docs.packageDescription;
            allDocs.classes.push(...docs.classes);
            allDocs.interfaces.push(...docs.interfaces);
            allDocs.functions.push(...docs.functions);
            allDocs.types.push(...docs.types);
        }
    }

    console.log(`\n  Found:`);
    console.log(`    - ${allDocs.classes.length} classes`);
    console.log(`    - ${allDocs.interfaces.length} interfaces`);
    console.log(`    - ${allDocs.functions.length} functions`);
    console.log(`    - ${allDocs.types.length} types`);

    // Filter interfaces for index page too (skip Express's Request extension)
    const validInterfaces = allDocs.interfaces.filter(i => 
        (i.description || i.properties.length > 0 || i.examples.length > 0) &&
        i.name !== 'Request'
    );

    // Generate index page
    const indexMDX = `---
title: SDK Reference
description: Complete API reference for the FullEvent Node.js SDK
---

# SDK Reference

${allDocs.packageDescription || 'Complete API reference for the FullEvent Node.js SDK.'}

## Classes

${allDocs.classes.map(c => `- [${c.name}](/docs/sdk-reference/classes/${c.name.toLowerCase()}) - ${c.description.split('\n')[0]}`).join('\n')}

## Middleware

${allDocs.functions.filter(f => f.category === 'Middleware').map(f => `- [${f.name}](/docs/sdk-reference/middleware/${f.name.toLowerCase()}) - ${f.description.split('\n')[0]}`).join('\n')}

## Interfaces

${validInterfaces.map(i => `- [${i.name}](/docs/sdk-reference/interfaces/${i.name.toLowerCase()}) - ${i.description.split('\n')[0]}`).join('\n')}

## Types

${allDocs.types.map(t => `- [${t.name}](/docs/sdk-reference/types/${t.name.toLowerCase()}) - ${t.description.split('\n')[0]}`).join('\n')}
`;

    fs.writeFileSync(path.join(DOCS_OUTPUT, 'index.mdx'), indexMDX);
    console.log(`\n  Generated index.mdx`);

    // Create subdirectories
    const subdirs = ['classes', 'interfaces', 'middleware', 'types'];
    for (const subdir of subdirs) {
        const subdirPath = path.join(DOCS_OUTPUT, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath, { recursive: true });
        }
    }

    // Generate class pages
    for (const cls of allDocs.classes) {
        const mdx = generateClassMDX(cls);
        const filename = `${cls.name.toLowerCase()}.mdx`;
        fs.writeFileSync(path.join(DOCS_OUTPUT, 'classes', filename), mdx);
        console.log(`  Generated classes/${filename}`);
    }

    // Generate interface pages (skip empty/internal interfaces like Express's Request declaration)
    const filteredInterfaces = allDocs.interfaces.filter(i => 
        (i.description || i.properties.length > 0 || i.examples.length > 0) &&
        i.name !== 'Request' // Skip Express's Request extension
    );
    for (const iface of filteredInterfaces) {
        const mdx = generateInterfaceMDX(iface);
        const filename = `${iface.name.toLowerCase()}.mdx`;
        fs.writeFileSync(path.join(DOCS_OUTPUT, 'interfaces', filename), mdx);
        console.log(`  Generated interfaces/${filename}`);
    }

    // Generate function/middleware pages
    for (const func of allDocs.functions) {
        const mdx = generateFunctionMDX(func);
        const filename = `${func.name.toLowerCase()}.mdx`;
        const subdir = func.category === 'Middleware' ? 'middleware' : 'functions';
        const subdirPath = path.join(DOCS_OUTPUT, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath, { recursive: true });
        }
        fs.writeFileSync(path.join(subdirPath, filename), mdx);
        console.log(`  Generated ${subdir}/${filename}`);
    }

    // Generate type pages
    for (const type of allDocs.types) {
        const mdx = generateInterfaceMDX(type);
        const filename = `${type.name.toLowerCase()}.mdx`;
        fs.writeFileSync(path.join(DOCS_OUTPUT, 'types', filename), mdx);
        console.log(`  Generated types/${filename}`);
    }

    // Generate meta.json for Fumadocs navigation
    const middlewareFuncs = allDocs.functions.filter(f => f.category === 'Middleware');
    
    const meta = {
        title: 'SDK Reference',
        pages: [
            '...', // Auto-sort remaining pages
        ],
        // Define the order with separators
        defaultOpen: true,
    };

    fs.writeFileSync(path.join(DOCS_OUTPUT, 'meta.json'), JSON.stringify(meta, null, 2));
    console.log(`  Generated meta.json`);

    // Generate meta.json for classes subdirectory
    const classesMeta = {
        title: 'Classes',
        pages: allDocs.classes.map(c => c.name.toLowerCase()),
    };
    fs.writeFileSync(path.join(DOCS_OUTPUT, 'classes', 'meta.json'), JSON.stringify(classesMeta, null, 2));
    
    // Generate meta.json for interfaces subdirectory
    const interfacesMeta = {
        title: 'Interfaces',
        pages: validInterfaces.map(i => i.name.toLowerCase()),
    };
    fs.writeFileSync(path.join(DOCS_OUTPUT, 'interfaces', 'meta.json'), JSON.stringify(interfacesMeta, null, 2));
    
    // Generate meta.json for middleware subdirectory
    const middlewareMeta = {
        title: 'Middleware',
        pages: middlewareFuncs.map(f => f.name.toLowerCase()),
    };
    fs.writeFileSync(path.join(DOCS_OUTPUT, 'middleware', 'meta.json'), JSON.stringify(middlewareMeta, null, 2));
    
    // Generate meta.json for types subdirectory
    const typesMeta = {
        title: 'Types',
        pages: allDocs.types.map(t => t.name.toLowerCase()),
    };
    fs.writeFileSync(path.join(DOCS_OUTPUT, 'types', 'meta.json'), JSON.stringify(typesMeta, null, 2));

    console.log('\n✅ Documentation generated successfully!');
    console.log(`   Output: ${DOCS_OUTPUT}`);
}

main().catch(console.error);

