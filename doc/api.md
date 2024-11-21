# APIs

The Joyride API consist of:

1. The Joyride *Extension API*
   * `exports`
   * Extension commands
   * `when` clause context
1. The Joyride *Scripting API*
   * Scripting lifecycle management
   * Included clojure library namespaces

Give the [joyride_api.cljs](../examples/.joyride/scripts/joyride_api.cljs) example a spin, why don't ya!

Please note that Joyride's *Extension API* is also available to *Joyride scripts*.

## Extension API

Joyride's Extension API has these parts:

1. The `exports` map/object on the activated [extension](https://code.visualstudio.com/api/references/vscode-api#extensions) instance.
1. The Joyride extension commands.
1. [`when` clauses contexts](https://code.visualstudio.com/api/references/when-clause-contexts)

### `exports`

When the Joyride extension has activated it has the following API:

* `joyride.runCode`
  * Evaluates the the string provided and returns a promise with the result.
* `startNReplServer [project-root-path]`
   * Returns a promise resolving to the port where the nREPL server started
   * `project-root-path` is optional, defaulting to `vscode/workspace.rootPath`
* `getContextValue context-key`
   * Returns the value of a Joyride [`when` clause context](#when-clause-context)
   * Returns undefined for non-existing `context-key`s

You reach the API through the `exports` field on the Joyride extension:

``` js
const joyrideExtension = vscode.extensions.getExtension("betterthantomorrow.joyride");
const joyride = joyrideExtension.exports;
```

Note that `runCode` will return the ClojureScript results. And if an error occurs it will be a ClojureScript error. This means that if you are consuming the API from JavaScript/TypeScript you will need to convert the results, as well as any error. You can use Joyride's ClojureScript (SCI) interpreter for this:

``` js
const toJS = await joyride.runCode("clj->js");
const exData = await joyride.runCode("ex-data");

const r = joyride.runCode("{:a (some-fn)}")
  .catch(e => vscode.windiow.showErrorMessage(JSON.stringify(toJS(exData(e)))));

if (r) {
  const js_r = await toJS(r);
  vscode.window.showInformationMessage(js_r);
}
```

### Extension commands

Select Joyride from the VS Code Extension pane to see which commands it provides. The commands you'll probably use the most are:

* `joyride.runCode`
* `joyride.evaluatSelection `
* `joyride.runUserScript`
* `joyride.runWorkspaceScript`

The same note about ClojureScript applias for the `joyride.runCode` command as for the corresponding API export, mentioned above. Fetching the `clj->js` function looks more like so in this case:

``` js
const toJS = await vscode.commands.executeCommand('joyride.runCode', "clj->js");
```

### `when` clause context

The following contexts are available for users of Joyride when binding commands to keyboard shortcuts:

* `joyride.isActive`, `boolean` - Whether the joyRide extension is active or not
* `joyride.isNReplServerRunning`, `boolean` - Whether the Joyride nREPL server is running or not

If your script needs access to these contexts, use the `getContextValue` function from the [Joyride `exports`](#exports) API.

## Scripting API

### The Joyride classpath

Joyride has a fixed ”classpath” (the paths where it looks for roots to your Joyride code source files). It searches these directories in this order:

1. `<workspace-root>/.joyride/src`
1. `<workspace-root>/.joyride/scripts`
1. `<user-home>/.config/joyride/src`
1. `<user-home>/.config/joyride/scripts`

The first file found will be used.

### Scripting lifecycle

You can make some code run when Joyride activates, by naming the scripts `activate.cljs`. The activations script will be run in the order:

1. `<User scripts directory>/activate.cljs`
1. `<Workspace scripts directory>/activate.cljs`

Look at the [Activation example](../examples/.joyride/scripts/activate.cljs) script for a way to use this, and for a way to make the script re-runnable.

### NPM modules

To use npm modules these need to be installed in the path somewhere in the path from where the script using it resides, to the root of the filessystem. Consider using `<user-home>/.config/joyride` and `<ws-root>/.joyride`. (`yarn` or `npm i` both work, Joyride doesn't care, it looks for stuff in `node_modules`).

See [examples/.joyride/scripts/html_to_hiccup.cljs](examples/.joyride/scripts/html_to_hiccup.cljs) for an example.

The modules you use need to be in CommonJS format.

You can reload an updated npm module by adding `:reload` to the require form requiring it.

### JavaScript files

You can require JavaScript files (CommonJS) from your scripts by using absolute or relative paths to the JS files. Like in actual JavaScript, relative paths need to start with the current or parent directory to separate them from node module requires. If you provide the `:reload` option to the require form, the code in these files are reloaded when you re-require them from Clojure code. See [Examples Requiring JavaScript Files](../examples/README.md#requiring-javascript-files) for an example.

### VS Code, and Extension ”namespaces”

Joyride exposes its `vscode` module for scripts to consume. You require it like so:

```clojure
(ns joyride-api
  (:require ...
            ["vscode" :as vscode]
            ...))
```

VS Code Extensions that export an API can be required using the `ext://` prefix followed by the extension identifier. For instance, to require [Calva's Extension API](https://calva.io/api/) use `"ext://betterthantomorrow.calva"`. Optionally you can specify any submodules in the exported API by suffixing the namespace with a `$` followed by the dotted path of the submodule. You can also `refer` objects in the API and submodules. Like so:

```clojure
(ns calva-api
  (:require ...
            ["ext://betterthantomorrow.calva$v0" :as calva :refer [repl ranges]])
            ...)

(def current-form-text (second (ranges.currentForm)))
```

### VS Code and Node.js interfaces

This does not work in Joyride SCI:

```
(deftype Foo []
             Object
  (bar [x y] ...))
```

Do this instead:

```
#js {:bar (fn [x y] ...)}
```

The latter should not be instantiated. Just be used wherever an instance is expected.

See [examples/.joyride/src/problem_hover.cljs](examples/.joyride/src/problem_hover.cljs) for an example. (Used from the [user_activate.cljs template](assets/getting-started-content/user/user_activate.cljs))

### ClojureScript Namespaces

In addition to `clojure.core`, `clojure.set`, `clojure.edn`, `clojure.string`,
`clojure.walk`, `clojure.data`, `cljs.test`, and `clojure.zip`, Joyride makes the following libraries available:

* [Promesa](https://cljdoc.org/d/funcool/promesa/ (partly, see [below](#promesacore))
* [rewrite-clj](https://github.com/clj-commons/rewrite-clj)

Lacking some particular library? Please consider contributing to [babashka/sci.configs](https://github.com/babashka/sci.configs)!

In addition to these there is also `joyride.core`:

#### `joyride.core`

- `*file*`: dynamic var holding the absolute path of file where the current evaluation is taking place
- `invoked-script`: function returning the absolute path of the invoked script when running as a script. Otherwise returns `nil`. Together with `*file*` this can be used to create a guard that avoids running certain code when you load a file in the REPL:
  ```clojure
  (when (= (joyride/invoked-script) joyride/*file*)
    (main))
  ```
- `extension-context`: function returning the Joyride [ExtensionContext](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext) instance
- `output-channel`: function returning the Joyride [OutputChannel](https://code.visualstudio.com/api/references/vscode-api#OutputChannel) instance
- `js-properties`: a function returning a sequence of the full JS API of the provided JS object/instance. For use instead of `cljs.core/js-keys` when it doesn't return the full API.

Here's a snippet from the [joyride_api.cljs](../examples/.joyride/scripts/joyride_api.cljs) example.

```clojure
(ns your-awesome-script
  (:require [joyride.core :as joyride]
            ...))

(doto (joyride/output-channel)
  (.show true)
  (.append "Writing to the ")
  (.appendLine "Joyride output channel.")
  (.appendLine (str "Joyride extension path: "
                    (-> (joyride/extension-context)
                        .-extension
                        .-extensionPath)))
  (.appendLine (str "joyride/*file*: " joyride/*file*))
  (.appendLine (str "Invoked script: " (joyride/invoked-script)))
  (.appendLine "🎉"))
```

**NB**: Currently, using bar `*file*` works. But it will probably stop working soon. Always use it from `joyride.core`.

#### promesa.core

See [promesa docs for how to use it](https://cljdoc.org/d/funcool/promesa/11.0.678/doc/promises).

NB: All of Promesa is not available in Joyride. Exactly how much is supported depends on which version of
[sci-configs](https://github.com/babashka/sci.configs) Joyride is built with. At the time of this writing, we were using commit `3cd48a595bace287554b1735bb378bad1d22b931`.

To check what you can use from Promesa you can check sci-config for the given commit, like so:
* https://github.com/babashka/sci.configs/blob/3cd48a595bace287554b1735bb378bad1d22b931/src/sci/configs/funcool/promesa.cljs

You'll find the commit id to use for latest Joyride in [deps.edn of this repo](../deps.edn).


