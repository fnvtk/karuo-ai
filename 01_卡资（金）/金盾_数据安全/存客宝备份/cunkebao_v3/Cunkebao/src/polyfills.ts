// ES5兼容性polyfill - 确保在低版本浏览器中正常运行
// 特别针对Android 7等低版本内核优化

// 基础polyfill
import "core-js/stable";
import "regenerator-runtime/runtime";

// Promise支持
import "core-js/features/promise";

// Array方法支持
import "core-js/features/array/from";
import "core-js/features/array/find";
import "core-js/features/array/includes";
import "core-js/features/array/find-index";
import "core-js/features/array/fill";
import "core-js/features/array/copy-within";

// Object方法支持
import "core-js/features/object/assign";
import "core-js/features/object/entries";
import "core-js/features/object/values";
import "core-js/features/object/keys";

// String方法支持
import "core-js/features/string/includes";
import "core-js/features/string/starts-with";
import "core-js/features/string/ends-with";
import "core-js/features/string/pad-start";
import "core-js/features/string/pad-end";
import "core-js/features/string/trim-start";
import "core-js/features/string/trim-end";
import "core-js/features/string/repeat";

// Number方法支持
import "core-js/features/number/is-finite";
import "core-js/features/number/is-integer";
import "core-js/features/number/is-nan";
import "core-js/features/number/is-safe-integer";

// Math方法支持
import "core-js/features/math/sign";
import "core-js/features/math/trunc";
import "core-js/features/math/cbrt";
import "core-js/features/math/clz32";
import "core-js/features/math/imul";
import "core-js/features/math/fround";
import "core-js/features/math/hypot";

// Map和Set支持
import "core-js/features/map";
import "core-js/features/set";
import "core-js/features/weak-map";
import "core-js/features/weak-set";

// Symbol支持
import "core-js/features/symbol";
import "core-js/features/symbol/for";
import "core-js/features/symbol/key-for";

// 正则表达式支持
import "core-js/features/regexp/flags";
import "core-js/features/regexp/sticky";

// 函数支持
import "core-js/features/function/name";
import "core-js/features/function/has-instance";

// 全局对象支持
import "core-js/features/global-this";

// 确保全局对象可用
if (typeof window !== "undefined") {
  // 确保Promise在全局可用
  if (!window.Promise) {
    window.Promise = require("core-js/features/promise");
  }

  // 确保fetch在全局可用
  if (!window.fetch) {
    window.fetch = require("whatwg-fetch");
  }

  // 确保requestAnimationFrame在全局可用
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      return setTimeout(callback, 1000 / 60);
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  }

  // 确保IntersectionObserver在全局可用
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = function (callback, options) {
      return {
        observe: function () {},
        unobserve: function () {},
        disconnect: function () {},
      };
    };
  }

  // 确保ResizeObserver在全局可用
  if (!window.ResizeObserver) {
    window.ResizeObserver = function (callback) {
      return {
        observe: function () {},
        unobserve: function () {},
        disconnect: function () {},
      };
    };
  }

  // 确保MutationObserver在全局可用
  if (!window.MutationObserver) {
    window.MutationObserver = function (callback) {
      return {
        observe: function () {},
        disconnect: function () {},
      };
    };
  }

  // 确保Performance API在全局可用
  if (!window.performance) {
    window.performance = {
      now: function () {
        return Date.now();
      },
    };
  }

  // 确保URLSearchParams在全局可用
  if (!window.URLSearchParams) {
    window.URLSearchParams = require("core-js/features/url-search-params");
  }

  // 确保URL在全局可用
  if (!window.URL) {
    window.URL = require("core-js/features/url");
  }

  // 确保AbortController在全局可用
  if (!window.AbortController) {
    window.AbortController = function () {
      return {
        signal: {
          aborted: false,
          addEventListener: function () {},
          removeEventListener: function () {},
        },
        abort: function () {
          this.signal.aborted = true;
        },
      };
    };
  }

  // 确保AbortSignal在全局可用
  if (!window.AbortSignal) {
    window.AbortSignal = {
      abort: function () {
        return {
          aborted: true,
          addEventListener: function () {},
          removeEventListener: function () {},
        };
      },
    };
  }
}
