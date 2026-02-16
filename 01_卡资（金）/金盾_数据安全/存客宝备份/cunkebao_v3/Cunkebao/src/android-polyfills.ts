// Android 专用 polyfill - 解决Android 7等低版本系统的兼容性问题

// 检测是否为Android设备
const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

// 检测Android版本
const getAndroidVersion = () => {
  const match = navigator.userAgent.match(/Android\s+(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

// 检测是否为低版本Android
const isLowVersionAndroid = () => {
  const version = getAndroidVersion();
  return version <= 7; // Android 7及以下版本
};

// 只在Android设备上执行polyfill
if (isAndroid() && isLowVersionAndroid()) {
  console.log("检测到低版本Android系统，启用兼容性polyfill");

  // 修复Array.prototype.includes在Android WebView中的问题
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return false;
      }
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len + n, 0);
      while (k < len) {
        if (o[k] === searchElement) {
          return true;
        }
        k++;
      }
      return false;
    };
  }

  // 修复String.prototype.includes在Android WebView中的问题
  if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
      if (typeof start !== "number") {
        start = 0;
      }
      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }

  // 修复String.prototype.startsWith在Android WebView中的问题
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
    };
  }

  // 修复String.prototype.endsWith在Android WebView中的问题
  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString, length) {
      if (length === undefined || length > this.length) {
        length = this.length;
      }
      return (
        this.substring(length - searchString.length, length) === searchString
      );
    };
  }

  // 修复Array.prototype.find在Android WebView中的问题
  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
      if (this == null) {
        throw new TypeError("Array.prototype.find called on null or undefined");
      }
      if (typeof predicate !== "function") {
        throw new TypeError("predicate must be a function");
      }
      var list = Object(this);
      var length = parseInt(list.length) || 0;
      var thisArg = arguments[1];
      for (var i = 0; i < length; i++) {
        var element = list[i];
        if (predicate.call(thisArg, element, i, list)) {
          return element;
        }
      }
      return undefined;
    };
  }

  // 修复Array.prototype.findIndex在Android WebView中的问题
  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate) {
      if (this == null) {
        throw new TypeError(
          "Array.prototype.findIndex called on null or undefined",
        );
      }
      if (typeof predicate !== "function") {
        throw new TypeError("predicate must be a function");
      }
      var list = Object(this);
      var length = parseInt(list.length) || 0;
      var thisArg = arguments[1];
      for (var i = 0; i < length; i++) {
        var element = list[i];
        if (predicate.call(thisArg, element, i, list)) {
          return i;
        }
      }
      return -1;
    };
  }

  // 修复Object.assign在Android WebView中的问题
  if (typeof Object.assign !== "function") {
    Object.assign = function (target) {
      if (target == null) {
        throw new TypeError("Cannot convert undefined or null to object");
      }
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  // 修复Array.from在Android WebView中的问题
  if (!Array.from) {
    Array.from = (function () {
      var toStr = Object.prototype.toString;
      var isCallable = function (fn) {
        return (
          typeof fn === "function" || toStr.call(fn) === "[object Function]"
        );
      };
      var toInteger = function (value) {
        var number = Number(value);
        if (isNaN(number)) {
          return 0;
        }
        if (number === 0 || !isFinite(number)) {
          return number;
        }
        return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
      };
      var maxSafeInteger = Math.pow(2, 53) - 1;
      var toLength = function (value) {
        var len = toInteger(value);
        return Math.min(Math.max(len, 0), maxSafeInteger);
      };
      return function from(arrayLike) {
        var C = this;
        var items = Object(arrayLike);
        if (arrayLike == null) {
          throw new TypeError(
            "Array.from requires an array-like object - not null or undefined",
          );
        }
        var mapFunction = arguments.length > 1 ? arguments[1] : void undefined;
        var T;
        if (typeof mapFunction !== "undefined") {
          if (typeof mapFunction !== "function") {
            throw new TypeError(
              "Array.from: when provided, the second argument must be a function",
            );
          }
          if (arguments.length > 2) {
            T = arguments[2];
          }
        }
        var len = toLength(items.length);
        var A = isCallable(C) ? Object(new C(len)) : new Array(len);
        var k = 0;
        var kValue;
        while (k < len) {
          kValue = items[k];
          if (mapFunction) {
            A[k] =
              typeof T === "undefined"
                ? mapFunction(kValue, k)
                : mapFunction.call(T, kValue, k);
          } else {
            A[k] = kValue;
          }
          k += 1;
        }
        A.length = len;
        return A;
      };
    })();
  }

  // 修复requestAnimationFrame在Android WebView中的问题
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      return setTimeout(function () {
        callback(Date.now());
      }, 1000 / 60);
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  }

  // 修复IntersectionObserver在Android WebView中的问题
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = function (callback, options) {
      this.callback = callback;
      this.options = options || {};
      this.observers = [];

      this.observe = function (element) {
        this.observers.push(element);
        // 简单的实现，实际项目中可能需要更复杂的逻辑
        setTimeout(() => {
          this.callback([
            {
              target: element,
              isIntersecting: true,
              intersectionRatio: 1,
            },
          ]);
        }, 100);
      };

      this.unobserve = function (element) {
        var index = this.observers.indexOf(element);
        if (index > -1) {
          this.observers.splice(index, 1);
        }
      };

      this.disconnect = function () {
        this.observers = [];
      };
    };
  }

  // 修复ResizeObserver在Android WebView中的问题
  if (!window.ResizeObserver) {
    window.ResizeObserver = function (callback) {
      this.callback = callback;
      this.observers = [];

      this.observe = function (element) {
        this.observers.push(element);
      };

      this.unobserve = function (element) {
        var index = this.observers.indexOf(element);
        if (index > -1) {
          this.observers.splice(index, 1);
        }
      };

      this.disconnect = function () {
        this.observers = [];
      };
    };
  }

  // 修复URLSearchParams在Android WebView中的问题
  if (!window.URLSearchParams) {
    window.URLSearchParams = function (init) {
      this.params = {};

      if (init) {
        if (typeof init === "string") {
          if (init.charAt(0) === "?") {
            init = init.slice(1);
          }
          var pairs = init.split("&");
          for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            var key = decodeURIComponent(pair[0]);
            var value = decodeURIComponent(pair[1] || "");
            this.append(key, value);
          }
        }
      }

      this.append = function (name, value) {
        if (!this.params[name]) {
          this.params[name] = [];
        }
        this.params[name].push(value);
      };

      this.get = function (name) {
        return this.params[name] ? this.params[name][0] : null;
      };

      this.getAll = function (name) {
        return this.params[name] || [];
      };

      this.has = function (name) {
        return !!this.params[name];
      };

      this.set = function (name, value) {
        this.params[name] = [value];
      };

      this.delete = function (name) {
        delete this.params[name];
      };

      this.toString = function () {
        var pairs = [];
        for (var key in this.params) {
          if (this.params.hasOwnProperty(key)) {
            for (var i = 0; i < this.params[key].length; i++) {
              pairs.push(
                encodeURIComponent(key) +
                  "=" +
                  encodeURIComponent(this.params[key][i]),
              );
            }
          }
        }
        return pairs.join("&");
      };
    };
  }

  console.log("Android兼容性polyfill已加载完成");
}
