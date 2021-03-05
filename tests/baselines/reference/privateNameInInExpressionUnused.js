//// [privateNameInInExpressionUnused.ts]
// TODO(aclaymore): verify we want this behavior

class Foo {
    private readonly unused: undefined; // expect unused error
    readonly #brand: undefined; // expect no error

    isFoo(v: any): v is Foo {
        // This should count as using/reading '#p1'
        return #brand in v;
    }
}


//// [privateNameInInExpressionUnused.js]
"use strict";
// TODO(aclaymore): verify we want this behavior
class Foo {
    #brand; // expect no error
    isFoo(v) {
        // This should count as using/reading '#p1'
        return #brand in v;
    }
}
