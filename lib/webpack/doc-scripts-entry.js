"use strict";

function _await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

var path = require('path');

function _empty() {}

var fs = require('fs-extra');

function _invokeIgnored(body) {
  var result = body();

  if (result && result.then) {
    return result.then(_empty);
  }
}

var _require = require('./markdown'),
    parseToc = _require.parseToc;

function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }

        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }

    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }

    pact.s = state;
    pact.v = value;
    var observer = pact.o;

    if (observer) {
      observer(pact);
    }
  }
}

var cwd = process.cwd();

var _Pact =
/*#__PURE__*/
function () {
  function _Pact() {}

  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;

    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;

      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }

        return result;
      } else {
        return this;
      }
    }

    this.o = function (_this) {
      try {
        var value = _this.v;

        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };

    return result;
  };

  return _Pact;
}();

function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}

function _forTo(array, body, check) {
  var i = -1,
      pact,
      reject;

  function _cycle(result) {
    try {
      while (++i < array.length && (!check || !check())) {
        result = body(i);

        if (result && result.then) {
          if (_isSettledPact(result)) {
            result = result.v;
          } else {
            result.then(_cycle, reject || (reject = _settle.bind(null, pact = new _Pact(), 2)));
            return;
          }
        }
      }

      if (pact) {
        _settle(pact, 1, result);
      } else {
        pact = result;
      }
    } catch (e) {
      _settle(pact || (pact = new _Pact()), 2, e);
    }
  }

  _cycle();

  return pact;
}

var toArr = function toArr(val) {
  return Array.isArray(val) ? val : val ? [val] : [];
};

function _continueIgnored(value) {
  if (value && value.then) {
    return value.then(_empty);
  }
}

var pkg = {};

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _continue(value, then) {
  return value && value.then ? value.then(then) : then(value);
}

function _async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

function _invoke(body, then) {
  var result = body();

  if (result && result.then) {
    return result.then(then);
  }

  return then(result);
}

try {
  pkg = require(path.resolve(cwd, './package.json'));
} catch (e) {}

var getDocs = _async(function (dir) {
  var list = [];
  var newList = [];
  return _continue(_catch(function () {
    return _await(fs.readdir(dir), function (_fs$readdir) {
      list = _fs$readdir;
      return _continueIgnored(_forTo(list, function (i) {
        var _path = path.resolve(dir, list[i]);

        return _await(fs.stat(_path), function (stat) {
          return _invokeIgnored(function () {
            if (_path.indexOf('node_modules') > -1) {} else return _invokeIgnored(function () {
              if (stat.isDirectory()) {
                var _newList2 = newList,
                    _concat2 = _newList2.concat;
                return _await(getDocs(_path), function (_getDocs) {
                  newList = _concat2.call(_newList2, _getDocs);
                });
              } else if (/\.md$/gi.test(_path) && !/summary\.md/gi.test(_path)) {
                newList.push(_path);
              } else {}
            });
          });
        });
      }));
    });
  }, function (e) {
    console.error(e);
  }), function () {
    return newList;
  });
});

var parseSummary = _async(function (filePath) {
  return _await(fs.readFile(filePath, 'utf8'), function (file) {
    return _await(parseToc(file, function (node) {
      if (node.link && !node.isRemoteUrl) {
        node.link = path.resolve(path.dirname(filePath), node.link);
        node.path = node.link;
      }

      return node;
    }));
  });
});

var importTemplate = function importTemplate(path, lazy) {
  if (lazy === void 0) {
    lazy = true;
  }

  var importPath = "import('" + path + "')";
  return lazy ? "React.lazy(function(){return " + importPath + "})" : "await " + importPath;
};

var createDeps = function createDeps(docs, lazy) {
  var paths = {};

  var _createDeps = function _createDeps(docs) {
    var deps = [];

    if (Array.isArray(docs)) {
      docs.forEach(function (path) {
        if (typeof path === 'string' && !paths[path] && !path.isRemoteUrl) {
          deps.push("\"" + path + "\":" + importTemplate(path, lazy));
          paths[path] = true;
        } else {
          if (path.link && !paths[path.link] && path.depth <= 1 && !path.isRemoteUrl && (!path.children || path.children && !path.children.length)) {
            deps.push("\"" + path.link + "\":" + importTemplate(path.link, lazy));
            paths[path.link] = true;
          }

          if (path && path.children) {
            deps = deps.concat(_createDeps(path.children, lazy));
          }
        }
      });
    } else {
      if (docs.link && !paths[docs.link] && docs.depth <= 1 && !docs.isRemoteUrl && (!docs.children || docs.children && !docs.children.length)) {
        deps.push("\"" + docs.link + "\":" + importTemplate(docs.link));
        paths[docs.link] = true;
      }

      if (Array.isArray(docs.children)) {
        deps = deps.concat(_createDeps(docs.children));
      }
    }

    return deps;
  };

  return _createDeps(docs).join(',');
};

module.exports = _async(function (options) {
  var lazy = options.lazy !== undefined ? options.lazy : true;
  var inputPath = options.input ? options.input : cwd;
  var rendererPath = options.renderer ? options.renderer : path.resolve(cwd, './doc-scripts.renderer.js');
  var summaryPath = options.summaryPath ? options.summaryPath : path.resolve(inputPath, './SUMMARY.md');
  var hasRenderer = false;
  var hasSummary = false;
  var docs = [];
  return _continue(_catch(function () {
    return _await(fs.access(rendererPath), function () {
      hasRenderer = true;
    });
  }, _empty), function () {
    return _continue(_catch(function () {
      return _await(fs.access(summaryPath), function () {
        hasSummary = true;
      });
    }, _empty), function () {
      return _invoke(function () {
        if (!hasSummary) {
          return _await(getDocs(inputPath), function (_getDocs2) {
            docs = _getDocs2;
          });
        } else {
          return _await(parseSummary(summaryPath), function (_parseSummary) {
            docs = _parseSummary;
          });
        }
      }, function () {
        var code = "\n  import React from 'react'\n  import ReactDOM from 'react-dom'\n  import ReactDocRenderer from '" + (hasRenderer ? rendererPath : hasSummary ? 'react-site-renderer' : 'react-doc-renderer') + "'\n  import createDocs from '" + path.resolve(__dirname, './docs') + "'\n  import '" + path.resolve(__dirname, './markdown.css') + "'\n  " + toArr(options.requires).map(function (path) {
          return "import '" + path + "'";
        }).join('\n') + "\n  (async () => {\n    const dependencies = {" + createDeps(docs, lazy) + "}\n    ReactDOM.render(\n      React.createElement(React.Suspense, {\n        fallback:React.createElement('div')\n      },\n        React.createElement(ReactDocRenderer, {\n          logo: React.createElement('span', {}, '" + (pkg.name || 'This is Logo') + "'),\n          docs: createDocs(" + JSON.stringify(docs) + ", " + JSON.stringify(hasSummary) + ", dependencies)\n        })\n      ),\n     document.getElementById('root')\n    );\n  })()\n  ";
        return {
          code: code
        };
      });
    });
  });
});