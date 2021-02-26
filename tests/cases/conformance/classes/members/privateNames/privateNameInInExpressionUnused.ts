// @strict: true
// @noUnusedLocals: true
// @target: esnext

// TODO(aclaymore): verify we want this behavior

class Foo {
    private readonly unused: undefined; // expect unused error
    readonly #brand: undefined; // expect no error

    isFoo(v: any): v is Foo {
        // This should count as using/reading '#p1'
        return #brand in v;
    }
}
