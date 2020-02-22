
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/Heroes.svelte generated by Svelte v3.18.2 */
    const file = "src/components/Heroes.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i].id;
    	child_ctx[4] = list[i].name;
    	child_ctx[5] = list[i].body;
    	child_ctx[6] = list[i].src;
    	return child_ctx;
    }

    // (84:4) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Героев не найдено!";
    			add_location(p, file, 84, 6, 8454);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(84:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (75:4) {#each heroes_list as {id, name, body, src}
    function create_each_block(key_1, ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div0;
    	let h5;
    	let t1_value = /*name*/ ctx[4] + "";
    	let t1;
    	let t2;
    	let p;
    	let t3_value = /*body*/ ctx[5] + "";
    	let t3;
    	let t4;
    	let a;
    	let t5;
    	let a_id_value;
    	let t6;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h5 = element("h5");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			a = element("a");
    			t5 = text("Узнать подробнее");
    			t6 = space();
    			attr_dev(img, "class", "card-img-top");
    			if (img.src !== (img_src_value = /*src*/ ctx[6])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*name*/ ctx[4]);
    			add_location(img, file, 76, 8, 8088);
    			attr_dev(h5, "class", "card-title");
    			add_location(h5, file, 78, 10, 8193);
    			attr_dev(p, "class", "card-text");
    			add_location(p, file, 79, 10, 8238);
    			attr_dev(a, "href", "#exampleModalLong");
    			attr_dev(a, "class", "btn btn-primary mt-auto");
    			attr_dev(a, "id", a_id_value = /*id*/ ctx[3]);
    			attr_dev(a, "data-toggle", "modal");
    			add_location(a, file, 80, 10, 8280);
    			attr_dev(div0, "class", "card-body d-flex flex-column");
    			add_location(div0, file, 77, 8, 8140);
    			attr_dev(div1, "class", "card col-lg-3 svelte-wx4wpl");
    			add_location(div1, file, 75, 6, 8052);
    			this.first = div1;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(p, t3);
    			append_dev(div0, t4);
    			append_dev(div0, a);
    			append_dev(a, t5);
    			append_dev(div1, t6);
    			dispose = listen_dev(a, "click", /*showDetail*/ ctx[2], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(75:4) {#each heroes_list as {id, name, body, src}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let div7;
    	let div6;
    	let div5;
    	let div2;
    	let h5;
    	let t1_value = /*about*/ ctx[0].name + "";
    	let t1;
    	let t2;
    	let button0;
    	let span;
    	let t4;
    	let div3;
    	let t5_value = /*about*/ ctx[0].more + "";
    	let t5;
    	let t6;
    	let div4;
    	let button1;
    	let each_value = /*heroes_list*/ ctx[1];
    	const get_key = ctx => /*id*/ ctx[3];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			t0 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			h5 = element("h5");
    			t1 = text(t1_value);
    			t2 = space();
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t4 = space();
    			div3 = element("div");
    			t5 = text(t5_value);
    			t6 = space();
    			div4 = element("div");
    			button1 = element("button");
    			button1.textContent = "Закрыть";
    			attr_dev(div0, "class", "row");
    			add_location(div0, file, 73, 2, 7974);
    			attr_dev(div1, "class", "container-fluid");
    			add_location(div1, file, 72, 0, 7942);
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "exampleModalLongTitle");
    			add_location(h5, file, 93, 8, 8761);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file, 95, 10, 8925);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file, 94, 8, 8838);
    			attr_dev(div2, "class", "modal-header");
    			add_location(div2, file, 92, 6, 8726);
    			attr_dev(div3, "class", "modal-body");
    			add_location(div3, file, 98, 6, 9002);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file, 102, 8, 9102);
    			attr_dev(div4, "class", "modal-footer");
    			add_location(div4, file, 101, 6, 9067);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file, 91, 4, 8692);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file, 90, 2, 8645);
    			attr_dev(div7, "class", "modal fade");
    			attr_dev(div7, "id", "exampleModalLong");
    			attr_dev(div7, "tabindex", "-1");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-labelledby", "exampleModalLongTitle");
    			attr_dev(div7, "aria-hidden", "true");
    			add_location(div7, file, 89, 0, 8509);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, h5);
    			append_dev(h5, t1);
    			append_dev(div2, t2);
    			append_dev(div2, button0);
    			append_dev(button0, span);
    			append_dev(div5, t4);
    			append_dev(div5, div3);
    			append_dev(div3, t5);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div4, button1);
    		},
    		p: function update(ctx, [dirty]) {
    			const each_value = /*heroes_list*/ ctx[1];
    			validate_each_keys(ctx, each_value, get_each_context, get_key);
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, destroy_block, create_each_block, null, get_each_context);

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block(ctx);
    				each_1_else.c();
    				each_1_else.m(div0, null);
    			}

    			if (dirty & /*about*/ 1 && t1_value !== (t1_value = /*about*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*about*/ 1 && t5_value !== (t5_value = /*about*/ ctx[0].more + "")) set_data_dev(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (each_1_else) each_1_else.d();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let heroes_list = [
    		{
    			id: 1,
    			name: "Арина Петровна",
    			body: "Арина Петровна Головлева является дворянкой, богатой помещицей. Она живет в своем имении Головлево где-то в глубинке России",
    			src: "https://www.kino-teatr.ru/acter/album/1010/547114.jpg",
    			more: " «Арина Петровна — женщина лет шестидесяти, но еще бодрая и привыкшая жить на всей своей воле. Держит она себя грозно; единолично и бесконтрольно управляет обширным головлёвским имением, живет уединенно, расчетливо, почти скупо, с соседями дружбы не водит, местным властям доброходствует, а от детей требует, чтоб они были в таком у нее послушании, чтобы при каждом поступке спрашивали себя: что-то об этом маменька скажет? Вообще имеет характер самостоятельный, непреклонный и отчасти строптивый, чему, впрочем, немало способствует и то, что во всем головлёвском семействе нет ни одного человека, со стороны которого она могла бы встретить противодействие.» — М. Е. Салтыков-Щедрин «Господа Головлёвы»."
    		},
    		{
    			id: 6,
    			name: "Владимир Михайлович",
    			body: "Владимир Михайлович Головлев является мужем властной помещицы Арины Петровны Головлевой",
    			src: "http://telespektakli.ru/published/publicdata/SMAN13NEW/attachments/SC/products_pictures/00-53-466u_enl.jpg",
    			more: "«Глава семейства, Владимир Михайлович Головлёв, еще смолоду был известен своим безалаберным и озорным характером, и для Арины Петровны, всегда отличавшейся серьёзностью и деловитостью, никогда ничего симпатичного не представлял. Он вел жизнь праздную и бездельную, чаще всего запирался у себя в кабинете, подражал пению скворцов, петухов и т. д. и занимался сочинением так называемых „вольных стихов“ <…> Арина Петровна сразу не залюбила этих стихов своего мужа, называла их паскудством и паясничаньем, а так как Владимир Михайлович собственно для того и женился, чтобы всегда иметь под рукой слушателя для своих стихов, то понятно, что размолвки не заставили долго ждать себя. Постепенно разрастаясь и ожесточаясь, размолвки эти кончились, со стороны жены, полным и презрительным равнодушием к мужу-шуту, со стороны мужа — искреннею ненавистью к жене, ненавистью, в которую, однако ж, входила значительная доля трусости» — М. Е. Салтыков-Щедрин «Господа Головлёвы»."
    		},
    		{
    			id: 3,
    			name: "Степан",
    			body: "Степан Владимирович Головлев - помещик, дворянин. Он является старшим сыном помещицы Арины Петровны Головлевой",
    			src: "https://www.kino-teatr.ru/acter/album/1928/107016.jpg",
    			more: "«Степан Владимирович, старший сын, <…>, слыл в семействе под именем Степки-балбеса и Степки-озорника. Он очень рано попал в число „постылых“ и с детских лет играл в доме роль не то парии, не то шута. К несчастию, это был даровитый малый, слишком охотно и быстро воспринимавший впечатления, которые вырабатывала окружающая среда. От отца он перенял неистощимую проказливость, от матери — способность быстро угадывать слабые стороны людей. Благодаря первому качеству, он скоро сделался любимцем отца, что еще больше усилило нелюбовь к нему матери. Часто, во время отлучек Арины Петровны по хозяйству, отец и подросток-сын удалялись в кабинет, украшенный портретом Баркова, читали стихи вольного содержания и судачили, причем в особенности доставалось „ведьме“, то есть Арине Петровне. Но „ведьма“ словно чутьем угадывала их занятия; неслышно подъезжала она к крыльцу, подходила на цыпочках к кабинетной двери и подслушивала веселые речи. Затем следовало немедленное и жестокое избиение Степки-балбеса. Но Степка не унимался; он был нечувствителен ни к побоям, ни к увещаниям и через полчаса опять принимался куролесить. То косынку у девки Анютки изрежет в куски, то сонной Васютке мух в рот напустит, то заберется на кухню и стянет там пирог (Арина Петровна, из экономии, держала детей впроголодь), который, впрочем, тут же разделит с братьями». — М. Е. Салтыков-Щедрин «Господа Головлёвы»."
    		},
    		{
    			id: 5,
    			name: "Анна Владимировна",
    			body: "Анна Владимировна Головлева (в замужестве Уланова) является  дочерью помещицы Арины Петровны Головлевой",
    			src: "http://m.kino-teatr.ru/movie/kadr/79996/541703.jpg",
    			more: " «После Степана Владимировича, старшим членом головлёвского семейства была дочь, Анна Владимировна, о которой Арина Петровна тоже не любила говорить. Дело в том, что на Аннушку Арина Петровна имела виды, а Аннушка не только не оправдала ее надежд, но вместо того на весь уезд учинила скандал. Когда дочь вышла из института, Арина Петровна поселила ее в деревне, в чаянье сделать из нее дарового домашнего секретаря и бухгалтера, а вместо того Аннушка, в одну прекрасную ночь, бежала из Головлёва с корнетом Улановым и повенчалась с ним. Года через два молодые капитал прожили, и корнет неизвестно куда бежал, оставив Анну Владимировну с двумя дочерьми-близнецами: Аннинькой и Любонькой. Затем и сама Анна Владимировна через три месяца скончалась, и Арина Петровна волей-неволей должна была приютить круглых сирот у себя. Что она и исполнила, поместив малюток во флигеле и приставив к ним кривую старуху Палашку». — М. Е. Салтыков-Щедрин «Господа Головлёвы»."
    		},
    		{
    			id: 2,
    			name: "Порфирий",
    			body: "Порфирий Владимирович Головлев, он же \"Иудушка\", является сыном помещицы Арины Петровны Головлевой. Он является средним из трех сыновей помещицы. Возраст Порфирия Головлева - около 40 лет",
    			src: "http://m.kino-teatr.ru/acter/album/22458/167402.jpg",
    			more: " «Порфирий Владимирович известен был в семействе под тремя именами: Иудушки, кровопивушки и откровенного мальчика, каковые прозвища еще в детстве были ему даны Степкой-балбесом. С младенческих лет любил он приласкаться к милому другу маменьке, украдкой поцеловать ее в плечико, а иногда и слегка понаушничать. Неслышно отворит, бывало, дверь маменькиной комнаты, неслышно прокрадется в уголок, сядет и, словно очарованный, не сводит глаз с маменьки, покуда она пишет или возится со счетами. Но Арина Петровна уже и тогда с какою-то подозрительностью относилась к этим сыновним заискиваньям. И тогда этот пристально устремленный на нее взгляд казался ей загадочным, и тогда она не могла определить себе, что именно он источает из себя: яд или сыновнюю почтительность» — М. Е. Салтыков-Щедрин «Господа Головлёвы»."
    		},
    		{
    			id: 4,
    			name: "Павел",
    			body: "Павел Владимирович Головлев является младшим сыном помещицы Арины Петровны Головлевой",
    			src: "https://www.kino-teatr.ru/acter/album/256124/145882.jpg",
    			more: "«Совершенную противоположность с Порфирием Владимировичем представлял брат его, Павел Владимирович. Это было полнейшее олицетворение человека, лишенного каких бы то ни было поступков. Еще мальчиком, он не выказывал ни малейшей склонности ни к ученью, ни к играм, ни к общительности, но любил жить особняком, в отчуждении от людей. Забьется, бывало, в угол, надуется и начнет фантазировать. Представляется ему, что он толокна наелся, что от этого ноги сделались у него тоненькие, и он не учится. Или — что он не Павел-дворянский сын, а Давыдка-пастух, что на лбу у него выросла болона, как и у Давыдки, что он арапником щелкает и не учится. Поглядит-поглядит, бывало, на него Арина Петровна, и так и раскипятится ее материнское сердце» — М. Е. Салтыков-Щедрин«Господа Головлёвы»."
    		}
    	]; // {
    	//   id: 7,
    	//   name: "Петенька и Володенька",

    	//   body: "Петенька и Володенька Головлевы являются сыновьями Порфирия (\"Иудушки\") Головлева и внуками богатой властной помещицы Арины Петровны Головлевой",
    	//   src: "https://kudago.com/media/images/event/ba/ce/bace2f2eac7f514a7112e98f4498cd61_3.jpg",
    	//
    	// },
    	let about = {};

    	function showDetail(event) {
    		// Get data of hero and show modal window
    		let searched_id = Number(event.target.getAttribute("id"));

    		$$invalidate(0, about = heroes_list.find(t => t.id === searched_id));
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("heroes_list" in $$props) $$invalidate(1, heroes_list = $$props.heroes_list);
    		if ("about" in $$props) $$invalidate(0, about = $$props.about);
    	};

    	return [about, heroes_list, showDetail];
    }

    class Heroes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Heroes",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.2 */

    // (7:0) {#if loading}
    function create_if_block(ctx) {
    	let current;
    	const heroes = new Heroes({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(heroes.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(heroes, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(heroes.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(heroes.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(heroes, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(7:0) {#if loading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*loading*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self) {
    	let loading = true;

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
    	};

    	return [loading];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
