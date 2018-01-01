/*--------------------------------------------------------------------------------*\
 | MIT License                                                                    |
 |                                                                                |
 | Copyright (c) 2017 Gustavo Takachi Toyota                                      |
 |                                                                                |
 | Permission is hereby granted, free of charge, to any person obtaining a copy   |
 | of this software and associated documentation files (the "Software"), to deal  |
 | in the Software without restriction, including without limitation the rights   |
 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell      |
 | copies of the Software, and to permit persons to whom the Software is          |
 | furnished to do so, subject to the following conditions:                       |
 |                                                                                |
 | The above copyright notice and this permission notice shall be included in all |
 | copies or substantial portions of the Software.                                |
 |                                                                                |
 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR     |
 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,       |
 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE    |
 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER         |
 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  |
 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE  |
 | SOFTWARE.                                                                      |
\*--------------------------------------------------------------------------------*/

function Token(name, title, pattern, ignore) {
    if (!(this instanceof Token))
        return new Token(name, title, pattern, ignore);
    
    this.name = name;
    this.title = title;
    this.pattern = pattern;
    this.ignore = ignore || false;
}

function TokenGroup(name, title, elems) {
    if (!(this instanceof TokenGroup))
        return new TokenGroup(name, title, elems);
    
    this.name = name;
    this.title = title;
    this.elems = elems;
}

function Lexer(tokens, groups, input) {
    if (!(this instanceof Lexer))
        return new Lexer(tokens, groups, input);
    
    // Tokens
    this.tokenNames = [];
    this.tokenTitles = {};
    this.ignoredTokens = {};
    for (var token of tokens) {
        this.tokenNames.push(token.name);
        this.tokenTitles[token.name] = token.title;
        if (token.ignore)
            this.ignoredTokens[token.name] = true;
    }
    
    // Groups
    this.groupInfos = {};
    for (var group of groups)
        this.groupInfos[group.name] = {title: group.title, elems: group.elems};
    
    // Patterns
    var patterns = "^(?:";
    for (var i = 0; i < tokens.length; ++i) {
        if (i != 0)
            patterns += "|";
        patterns += "(" + tokens[i].pattern + ")";
    }
    patterns += ")";
    this.patterns = new RegExp(patterns);
    
    // Reset
    if (input !== undefined)
        this.reset(input);
}

Lexer.prototype.reset = function (input) {
    // Input
    if (input !== undefined)
        this.input = input;
    
    // Debug
    this.line = 1;
    this.column = 1;
    
    // Cursor
    this.cursor = 0;
    
    // Token
    this.token = "";
    this.lexeme = "";
    
    this.nextToken();
};

Lexer.prototype.error = function (message) {
    throw "Line " + this.line + ", Column " + this.column + ": " + message;
};

Lexer.prototype.nextToken = function () {
    do {
        // Debug
        for (var c of this.lexeme) {
            if (c === "\n") {
                ++this.line;
                this.column = 1;
            } else
                ++this.column;
        }
        
        // End of file
        if (this.cursor >= this.input.length) {
            this.token = "";
            this.lexeme = "";
            return;
        }
        
        // Match tokens
        var matches = this.patterns.exec(this.input.substring(this.cursor));        
        if (matches === null)
            this.error("No token matched.");
        
        // Cursor
        this.cursor += matches[0].length;
        
        // Token
        for (var i = 1; i < matches.length; ++i) {
            if (matches[i] !== undefined) {
                this.token = this.tokenNames[i - 1];
                this.lexeme = matches[i];
                break;
            }
        }
    } while (this.token in this.ignoredTokens);
};

Lexer.prototype.eof = function () {
    // Verify end of file
    if (this.token != "")
        this.error("End of file expected.");
    
    // Succeeded
    return true;
};

Lexer.prototype.check = function (elem) {
    // Check group
    if (elem in this.groupInfos) {
        for (var groupElem of this.groupInfos[elem].elems)
            if (this.check(groupElem))
                return true;
        return false;
    }
    
    // Check token
    if (!(elem in this.tokenTitles))
        this.error("Invalid token: " + elem + ".");
    
    return this.token === elem;
};
Lexer.prototype.accept = function (elem) {
    // Check element
    if (!this.check(elem))
        return false;
    
    // Check succeeded
    this.nextToken();
    
    return true;
};
Lexer.prototype.assert = function (elem) {
    // Check element
    if (this.check(elem))
        return true;
    
    // Check failed
    if (elem in this.tokenTitles)
        this.error(this.tokenTitles[elem] + " expected.");
    else
        this.error(this.groupInfos[elem].title + " expected.");
};
Lexer.prototype.expect = function (elem) {
    // Assert element
    this.assert(elem);
    
    // Assert succeeded
    this.nextToken();
    
    return true;
};