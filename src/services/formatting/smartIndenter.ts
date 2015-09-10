///<reference path='..\services.ts' />

/* @internal */
namespace ts.formatting {
    export module SmartIndenter {

        const enum Value {
            Unknown = -1
        }

        export function getIndentation(position: number, sourceFile: SourceFile, options: EditorOptions): number {
            if (position > sourceFile.text.length) {
                return 0; // past EOF
            }

            let precedingToken = findPrecedingToken(position, sourceFile);
            if (!precedingToken) {
                return 0;
            }

            // no indentation in string \regex\template literals
            let precedingTokenIsLiteral =
                precedingToken.kind === SyntaxKind.StringLiteral ||
                precedingToken.kind === SyntaxKind.RegularExpressionLiteral ||
                precedingToken.kind === SyntaxKind.NoSubstitutionTemplateLiteral ||
                precedingToken.kind === SyntaxKind.TemplateHead ||
                precedingToken.kind === SyntaxKind.TemplateMiddle ||
                precedingToken.kind === SyntaxKind.TemplateTail;
            if (precedingTokenIsLiteral && precedingToken.getStart(sourceFile) <= position && precedingToken.end > position) {
                return 0;
            }

            let lineAtPosition = sourceFile.getLineAndCharacterOfPosition(position).line;

            if (precedingToken.kind === SyntaxKind.CommaToken && precedingToken.parent.kind !== SyntaxKind.BinaryExpression) {
                // previous token is comma that separates items in list - find the previous item and try to derive indentation from it
                let actualIndentation = getActualIndentationForListItemBeforeComma(precedingToken, sourceFile, options);
                if (actualIndentation !== Value.Unknown) {
                    return actualIndentation;
                }
            }

            // try to find node that can contribute to indentation and includes 'position' starting from 'precedingToken'
            // if such node is found - compute initial indentation for 'position' inside this node
            let previous: Node;
            let current = precedingToken;
            let currentStart: LineAndCharacter;
            let indentationDelta: number;

            while (current) {
                if (positionBelongsToNode(current, position, sourceFile) && shouldIndentChildNode(current.kind, previous ? previous.kind : SyntaxKind.Unknown)) {
                    currentStart = getStartLineAndCharacterForNode(current, sourceFile);

                    if (nextTokenIsCurlyBraceOnSameLineAsCursor(precedingToken, current, lineAtPosition, sourceFile)) {
                        indentationDelta = 0;
                    }
                    else {
                        indentationDelta = lineAtPosition !== currentStart.line ? options.IndentSize : 0;
                    }

                    break;
                }

                // check if current node is a list item - if yes, take indentation from it
                let actualIndentation = getActualIndentationForListItem(current, sourceFile, options);
                if (actualIndentation !== Value.Unknown) {
                    return actualIndentation;
                }
                actualIndentation = getLineIndentationWhenExpressionIsInMultiLine(current, sourceFile, options);
                if (actualIndentation !== Value.Unknown) {
                    return actualIndentation + options.IndentSize;
                }

                previous = current;
                current = current.parent;
            }

            if (!current) {
                // no parent was found - return 0 to be indented on the level of SourceFile
                return 0;
            }

            return getIndentationForNodeWorker(current, currentStart, /*ignoreActualIndentationRange*/ undefined, indentationDelta, sourceFile, options);
        }

        export function getIndentationForNode(n: Node, ignoreActualIndentationRange: TextRange, sourceFile: SourceFile, options: FormatCodeOptions): number {
            let start = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
            return getIndentationForNodeWorker(n, start, ignoreActualIndentationRange, /*indentationDelta*/ 0, sourceFile, options);
        }

        function getIndentationForNodeWorker(
            current: Node,
            currentStart: LineAndCharacter,
            ignoreActualIndentationRange: TextRange,
            indentationDelta: number,
            sourceFile: SourceFile,
            options: EditorOptions): number {

            let parent: Node = current.parent;
            let parentStart: LineAndCharacter;

            // walk upwards and collect indentations for pairs of parent-child nodes
            // indentation is not added if parent and child nodes start on the same line or if parent is IfStatement and child starts on the same line with 'else clause'
            while (parent) {
                let useActualIndentation = true;
                if (ignoreActualIndentationRange) {
                    let start = current.getStart(sourceFile);
                    useActualIndentation = start < ignoreActualIndentationRange.pos || start > ignoreActualIndentationRange.end;
                }

                if (useActualIndentation) {
                    // check if current node is a list item - if yes, take indentation from it
                    let actualIndentation = getActualIndentationForListItem(current, sourceFile, options);
                    if (actualIndentation !== Value.Unknown) {
                        return actualIndentation + indentationDelta;
                    }
                }
                parentStart = getParentStart(parent, current, sourceFile);
                let parentAndChildShareLine =
                    parentStart.line === currentStart.line ||
                    childStartsOnTheSameLineWithElseInIfStatement(parent, current, currentStart.line, sourceFile);

                if (useActualIndentation) {
                    // try to fetch actual indentation for current node from source text
                    let actualIndentation = getActualIndentationForNode(current, parent, currentStart, parentAndChildShareLine, sourceFile, options);
                    if (actualIndentation !== Value.Unknown) {
                        return actualIndentation + indentationDelta;
                    }
                    actualIndentation = getLineIndentationWhenExpressionIsInMultiLine(current, sourceFile, options);
                    if (actualIndentation !== Value.Unknown) {
                        return actualIndentation + indentationDelta;
                    }
                }

                // increase indentation if parent node wants its content to be indented and parent and child nodes don't start on the same line
                if (shouldIndentChildNode(parent.kind, current.kind) &&
                    !shouldInheritParentIndentation(current) && !parentAndChildShareLine) {

                    indentationDelta += options.IndentSize;
                }

                current = parent;
                currentStart = parentStart;
                parent = current.parent;
            }

            return indentationDelta;
        }


        function getParentStart(parent: Node, child: Node, sourceFile: SourceFile): LineAndCharacter {
            let containingList = getContainingList(child, sourceFile);
            if (containingList) {
                return sourceFile.getLineAndCharacterOfPosition(containingList.pos);
            }

            return sourceFile.getLineAndCharacterOfPosition(parent.getStart(sourceFile));
        }

        /*
         * Function returns Value.Unknown if indentation cannot be determined
         */
        function getActualIndentationForListItemBeforeComma(commaToken: Node, sourceFile: SourceFile, options: EditorOptions): number {
            // previous token is comma that separates items in list - find the previous item and try to derive indentation from it
            let commaItemInfo = findListItemInfo(commaToken);
            if (commaItemInfo && commaItemInfo.listItemIndex > 0) {
                return deriveActualIndentationFromList(commaItemInfo.list.getChildren(), commaItemInfo.listItemIndex - 1, sourceFile, options);
            }
            else {
                // handle broken code gracefully
                return Value.Unknown;
            }
        }

        /*
         * Function returns Value.Unknown if actual indentation for node should not be used (i.e because node is nested expression)
         */
        function getActualIndentationForNode(current: Node,
            parent: Node,
            currentLineAndChar: LineAndCharacter,
            parentAndChildShareLine: boolean,
            sourceFile: SourceFile,
            options: EditorOptions): number {

            // actual indentation is used for statements\declarations if one of cases below is true:
            // - parent is SourceFile - by default immediate children of SourceFile are not indented except when user indents them manually
            // - parent and child are not on the same line
            let useActualIndentation =
                (isDeclaration(current) || isStatement(current)) &&
                (parent.kind === SyntaxKind.SourceFile || !parentAndChildShareLine);

            if (!useActualIndentation) {
                return Value.Unknown;
            }

            return findColumnForFirstNonWhitespaceCharacterInLine(currentLineAndChar, sourceFile, options);
        }

        function nextTokenIsCurlyBraceOnSameLineAsCursor(precedingToken: Node, current: Node, lineAtPosition: number, sourceFile: SourceFile): boolean {
            let nextToken = findNextToken(precedingToken, current);
            if (!nextToken) {
                return false;
            }

            if (nextToken.kind === SyntaxKind.OpenBraceToken) {
                // open braces are always indented at the parent level
                return true;
            }
            else if (nextToken.kind === SyntaxKind.CloseBraceToken) {
                // close braces are indented at the parent level if they are located on the same line with cursor
                // this means that if new line will be added at $ position, this case will be indented
                // class A {
                //    $
                // }
                /// and this one - not
                // class A {
                // $}

                let nextTokenStartLine = getStartLineAndCharacterForNode(nextToken, sourceFile).line;
                return lineAtPosition === nextTokenStartLine;
            }

            return false;
        }

        function getStartLineAndCharacterForNode(n: Node, sourceFile: SourceFile): LineAndCharacter {
            return sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
        }
        
        export function childStartsOnTheSameLineWithElseInIfStatement(parent: Node, child: TextRangeWithKind, childStartLine: number, sourceFile: SourceFile): boolean {
            if (parent.kind === SyntaxKind.IfStatement && (<IfStatement>parent).elseStatement === child) {
                let elseKeyword = findChildOfKind(parent, SyntaxKind.ElseKeyword, sourceFile);
                Debug.assert(elseKeyword !== undefined);

                let elseKeywordStartLine = getStartLineAndCharacterForNode(elseKeyword, sourceFile).line;
                return elseKeywordStartLine === childStartLine;
            }

            return false;
        }

        function getContainingList(node: Node, sourceFile: SourceFile): NodeArray<Node> {
            if (node.parent) {
                switch (node.parent.kind) {
                    case SyntaxKind.TypeReference:
                        if ((<TypeReferenceNode>node.parent).typeArguments &&
                            rangeContainsStartEnd((<TypeReferenceNode>node.parent).typeArguments, node.getStart(sourceFile), node.getEnd())) {
                            return (<TypeReferenceNode>node.parent).typeArguments;
                        }
                        break;
                    case SyntaxKind.ObjectLiteralExpression:
                        return (<ObjectLiteralExpression>node.parent).properties;
                    case SyntaxKind.ArrayLiteralExpression:
                        return (<ArrayLiteralExpression>node.parent).elements;
                    case SyntaxKind.FunctionDeclaration:
                    case SyntaxKind.FunctionExpression:
                    case SyntaxKind.ArrowFunction:
                    case SyntaxKind.MethodDeclaration:
                    case SyntaxKind.MethodSignature:
                    case SyntaxKind.CallSignature:
                    case SyntaxKind.ConstructSignature: {
                        let start = node.getStart(sourceFile);
                        if ((<SignatureDeclaration>node.parent).typeParameters &&
                            rangeContainsStartEnd((<SignatureDeclaration>node.parent).typeParameters, start, node.getEnd())) {
                            return (<SignatureDeclaration>node.parent).typeParameters;
                        }
                        if (rangeContainsStartEnd((<SignatureDeclaration>node.parent).parameters, start, node.getEnd())) {
                            return (<SignatureDeclaration>node.parent).parameters;
                        }
                        break;
                    }
                    case SyntaxKind.NewExpression:
                    case SyntaxKind.CallExpression: {
                        let start = node.getStart(sourceFile);
                        if ((<CallExpression>node.parent).typeArguments &&
                            rangeContainsStartEnd((<CallExpression>node.parent).typeArguments, start, node.getEnd())) {
                            return (<CallExpression>node.parent).typeArguments;
                        }
                        if ((<CallExpression>node.parent).arguments &&
                            rangeContainsStartEnd((<CallExpression>node.parent).arguments, start, node.getEnd())) {
                            return (<CallExpression>node.parent).arguments;
                        }
                        break;
                    }
                }
            }
            return undefined;
        }

        function getActualIndentationForListItem(node: Node, sourceFile: SourceFile, options: EditorOptions): number {
            let containingList = getContainingList(node, sourceFile);
            return containingList ? getActualIndentationFromList(containingList) : Value.Unknown;

            function getActualIndentationFromList(list: Node[]): number {
                let index = indexOf(list, node);
                return index !== -1 ? deriveActualIndentationFromList(list, index, sourceFile, options) : Value.Unknown;
            }
        }

        function getLineIndentationWhenExpressionIsInMultiLine(node: Node, sourceFile: SourceFile, options: EditorOptions): number {
            // actual indentation should not be used when:
            // - node is close parenthesis - this is the end of the expression
            if (node.kind === SyntaxKind.CloseParenToken) {
                return Value.Unknown;
            }

            if (node.parent && (
                node.parent.kind === SyntaxKind.CallExpression ||
                node.parent.kind === SyntaxKind.NewExpression) &&
                (<CallExpression>node.parent).expression !== node) {

                let fullCallOrNewExpression = (<CallExpression | NewExpression>node.parent).expression;
                let startingExpression = getStartingExpression(<PropertyAccessExpression | CallExpression | ElementAccessExpression>fullCallOrNewExpression);

                if (fullCallOrNewExpression === startingExpression) {
                    return Value.Unknown;
                }

                let fullCallOrNewExpressionEnd = sourceFile.getLineAndCharacterOfPosition(fullCallOrNewExpression.end);
                let startingExpressionEnd = sourceFile.getLineAndCharacterOfPosition(startingExpression.end);

                if (fullCallOrNewExpressionEnd.line === startingExpressionEnd.line) {
                    return Value.Unknown;
                }

                return findColumnForFirstNonWhitespaceCharacterInLine(fullCallOrNewExpressionEnd, sourceFile, options);
            }

            return Value.Unknown;
            
            function getStartingExpression(node: PropertyAccessExpression | CallExpression | ElementAccessExpression) {
                while (true) {
                    switch (node.kind) {
                        case SyntaxKind.CallExpression:
                        case SyntaxKind.NewExpression:
                        case SyntaxKind.PropertyAccessExpression:
                        case SyntaxKind.ElementAccessExpression:

                            node = <PropertyAccessExpression | CallExpression | ElementAccessExpression | PropertyAccessExpression>node.expression;
                            break;
                        default:
                            return node;
                    }
                }
                return node;
            }
        }

        function deriveActualIndentationFromList(list: Node[], index: number, sourceFile: SourceFile, options: EditorOptions): number {
            Debug.assert(index >= 0 && index < list.length);
            let node = list[index];

            // walk toward the start of the list starting from current node and check if the line is the same for all items.
            // if end line for item [i - 1] differs from the start line for item [i] - find column of the first non-whitespace character on the line of item [i]
            let lineAndCharacter = getStartLineAndCharacterForNode(node, sourceFile);
            for (let i = index - 1; i >= 0; --i) {
                if (list[i].kind === SyntaxKind.CommaToken) {
                    continue;
                }
                // skip list items that ends on the same line with the current list element
                let prevEndLine = sourceFile.getLineAndCharacterOfPosition(list[i].end).line;
                if (prevEndLine !== lineAndCharacter.line) {
                    return findColumnForFirstNonWhitespaceCharacterInLine(lineAndCharacter, sourceFile, options);
                }

                lineAndCharacter = getStartLineAndCharacterForNode(list[i], sourceFile);
            }
            return Value.Unknown;
        }

        function findColumnForFirstNonWhitespaceCharacterInLine(lineAndCharacter: LineAndCharacter, sourceFile: SourceFile, options: EditorOptions): number {
            let lineStart = sourceFile.getPositionOfLineAndCharacter(lineAndCharacter.line, 0);
            return findFirstNonWhitespaceColumn(lineStart, lineStart + lineAndCharacter.character, sourceFile, options);
        }

        /*
            Character is the actual index of the character since the beginning of the line.
            Column - position of the character after expanding tabs to spaces
            "0\t2$"
            value of 'character' for '$' is 3
            value of 'column' for '$' is 6 (assuming that tab size is 4)
        */
        export function findFirstNonWhitespaceCharacterAndColumn(startPos: number, endPos: number, sourceFile: SourceFile, options: EditorOptions) {
            let character = 0;
            let column = 0;
            for (let pos = startPos; pos < endPos; ++pos) {
                let ch = sourceFile.text.charCodeAt(pos);
                if (!isWhiteSpace(ch)) {
                    break;
                }

                if (ch === CharacterCodes.tab) {
                    column += options.TabSize + (column % options.TabSize);
                }
                else {
                    column++;
                }

                character++;
            }
            return { column, character };
        }

        export function findFirstNonWhitespaceColumn(startPos: number, endPos: number, sourceFile: SourceFile, options: EditorOptions): number {
            return findFirstNonWhitespaceCharacterAndColumn(startPos, endPos, sourceFile, options).column;
        }

        function nodeContentIsAlwaysIndented(kind: SyntaxKind): boolean {
            switch (kind) {
                case SyntaxKind.ClassDeclaration:
                case SyntaxKind.ClassExpression:
                case SyntaxKind.InterfaceDeclaration:
                case SyntaxKind.EnumDeclaration:
                case SyntaxKind.TypeAliasDeclaration:
                case SyntaxKind.ArrayLiteralExpression:
                case SyntaxKind.Block:
                case SyntaxKind.ModuleBlock:
                case SyntaxKind.ObjectLiteralExpression:
                case SyntaxKind.TypeLiteral:
                case SyntaxKind.TupleType:
                case SyntaxKind.CaseBlock:
                case SyntaxKind.DefaultClause:
                case SyntaxKind.CaseClause:
                case SyntaxKind.ParenthesizedExpression:
                case SyntaxKind.PropertyAccessExpression:
                case SyntaxKind.CallExpression:
                case SyntaxKind.NewExpression:
                case SyntaxKind.VariableStatement:
                case SyntaxKind.VariableDeclaration:
                case SyntaxKind.ExportAssignment:
                case SyntaxKind.ReturnStatement:
                case SyntaxKind.ConditionalExpression:
                case SyntaxKind.ArrayBindingPattern:
                case SyntaxKind.ObjectBindingPattern:
                case SyntaxKind.JsxElement:
                case SyntaxKind.MethodSignature:
                case SyntaxKind.CallSignature:
                case SyntaxKind.ConstructSignature:
                case SyntaxKind.Parameter:
                case SyntaxKind.FunctionType:
                case SyntaxKind.ConstructorType:
                case SyntaxKind.ParenthesizedType:
                case SyntaxKind.TaggedTemplateExpression:
                case SyntaxKind.AwaitExpression:
                case SyntaxKind.ImportDeclaration:
                case SyntaxKind.NamedExports:
                case SyntaxKind.NamedImports:
                case SyntaxKind.ExportSpecifier:
                case SyntaxKind.ImportSpecifier:
                    return true;
            }
            return false;
        }

        export function shouldIndentChildNode(parent: SyntaxKind, child: SyntaxKind): boolean {
            if (nodeContentIsAlwaysIndented(parent)) {
                return true;
            }
            switch (parent) {
                case SyntaxKind.DoStatement:
                case SyntaxKind.WhileStatement:
                case SyntaxKind.ForInStatement:
                case SyntaxKind.ForOfStatement:
                case SyntaxKind.ForStatement:
                case SyntaxKind.IfStatement:
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.FunctionExpression:
                case SyntaxKind.MethodDeclaration:
                case SyntaxKind.ArrowFunction:
                case SyntaxKind.Constructor:
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    return child !== SyntaxKind.Block;
                case SyntaxKind.ExportDeclaration:
                    return child !== SyntaxKind.NamedExports;
                default:
                    return false;
            }
        }

        /**
         * Function returns true if a node should not get additional indentation in its parent node.
         */
        export function shouldInheritParentIndentation(node: TextRangeWithKind) {
            switch (node.kind) {
                case SyntaxKind.NamedExports:
                    return true;
                case SyntaxKind.ImportClause:
                    // NamedImports has its own braces as Block does
                    return (<ImportClause>node).namedBindings.kind === SyntaxKind.NamedImports;
            }
            return false;
        }
    }
}