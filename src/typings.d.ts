declare namespace d3 {
    
    namespace selection {
        export var prototype: Selection<any>;

        interface Update<Datum> {
            watchTransition(fn: Function, name: string, duration?: number): Update<Datum>;
        }

        interface Enter<Datum> {
            watchTransition(fn: Function, name: string, duration?: number): Enter<Datum>;
        }
    }

    interface Selection<Datum> {
        watchTransition(fn: Function, name: string, duration?: number): Selection<Datum>;
    }
}