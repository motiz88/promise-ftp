// Generated by CoffeeScript 1.10.0

/* jshint node:true */


/* jshint -W097 */

(function() {
  'use strict';
  var FtpClient, FtpConnectionError, FtpReconnectError, PromiseFtp, STATUSES, complexPassthroughMethods, otherPrototypeMethods, path, simplePassthroughMethods,
    slice = [].slice;

  FtpClient = require('ftp');

  path = require('path');

  FtpConnectionError = require('@motiz88/promise-ftp-common').FtpConnectionError;

  FtpReconnectError = require('@motiz88/promise-ftp-common').FtpReconnectError;

  STATUSES = require('@motiz88/promise-ftp-common').STATUSES;

  simplePassthroughMethods = ['ascii', 'binary', 'abort', 'delete', 'status', 'rename', 'listSafe', 'list', 'get', 'put', 'append', 'pwd', 'mkdir', 'rmdir', 'system', 'size', 'lastMod', 'restart'];

  complexPassthroughMethods = ['site', 'cwd', 'cdup'];

  otherPrototypeMethods = ['connect', 'reconnect', 'logout', 'end', 'destroy', 'getConnectionStatus'];

  PromiseFtp = (function() {
    var i, j, len, len1, methodList, methodName, ref;

    function PromiseFtp() {
      var _connect, autoReconnect, autoReconnectPromise, client, closeError, commonLogicFactory, connectOptions, connectionStatus, i, intendedCwd, j, lastError, len, len1, name, preserveCwd, promisifiedClientMethods, unexpectedClose;
      if (!(this instanceof PromiseFtp)) {
        throw new TypeError("PromiseFtp constructor called without 'new' keyword");
      }
      connectionStatus = STATUSES.NOT_YET_CONNECTED;
      client = new FtpClient();
      connectOptions = null;
      autoReconnect = null;
      preserveCwd = null;
      intendedCwd = '.';
      lastError = null;
      closeError = null;
      unexpectedClose = null;
      autoReconnectPromise = null;
      promisifiedClientMethods = {};
      client.on('error', function(err) {
        return lastError = err;
      });
      client.on('close', function(hadError) {
        if (hadError) {
          closeError = lastError;
        }
        unexpectedClose = connectionStatus !== STATUSES.DISCONNECTING && connectionStatus !== STATUSES.LOGGING_OUT;
        connectionStatus = STATUSES.DISCONNECTED;
        return autoReconnectPromise = null;
      });
      _connect = function(tempStatus) {
        return new Promise(function(resolve, reject) {
          var onError, onReady, serverMessage;
          connectionStatus = tempStatus;
          serverMessage = null;
          client.once('greeting', function(msg) {
            return serverMessage = msg;
          });
          onReady = function() {
            client.removeListener('error', onError);
            connectionStatus = STATUSES.CONNECTED;
            closeError = null;
            unexpectedClose = false;
            return resolve(serverMessage);
          };
          onError = function(err) {
            client.removeListener('ready', onReady);
            return reject(err);
          };
          client.once('ready', onReady);
          client.once('error', onError);
          return client.connect(connectOptions);
        });
      };
      this.connect = function(options) {
        return Promise.resolve().then(function() {
          var key, ref, value;
          if (connectionStatus !== STATUSES.NOT_YET_CONNECTED && connectionStatus !== STATUSES.DISCONNECTED) {
            throw new FtpConnectionError("can't connect when connection status is: '" + connectionStatus + "'");
          }
          connectOptions = {};
          for (key in options) {
            value = options[key];
            connectOptions[key] = value;
          }
          if (options.secureOptions) {
            connectOptions.secureOptions = {};
            ref = options.secureOptions;
            for (key in ref) {
              value = ref[key];
              connectOptions.secureOptions[key] = value;
            }
          }
          autoReconnect = !!options.autoReconnect;
          delete connectOptions.autoReconnect;
          preserveCwd = !!options.preserveCwd;
          delete connectOptions.preserveCwd;
          return _connect(STATUSES.CONNECTING);
        });
      };
      this.reconnect = function() {
        return Promise.resolve().then(function() {
          if (connectionStatus !== STATUSES.NOT_YET_CONNECTED && connectionStatus !== STATUSES.DISCONNECTED) {
            throw new FtpConnectionError("can't reconnect when connection status is: '" + connectionStatus + "'");
          }
          return _connect(STATUSES.RECONNECTING);
        });
      };
      this.logout = function() {
        var wait;
        wait = autoReconnectPromise ? autoReconnectPromise : Promise.resolve();
        return wait.then(function() {
          if (connectionStatus === STATUSES.NOT_YET_CONNECTED || connectionStatus === STATUSES.DISCONNECTED || connectionStatus === STATUSES.DISCONNECTING) {
            throw new FtpConnectionError("can't log out when connection status is: " + connectionStatus);
          }
          connectionStatus = STATUSES.LOGGING_OUT;
          return promisifiedClientMethods.logout();
        });
      };
      this.end = function() {
        return new Promise(function(resolve, reject) {
          if (connectionStatus === STATUSES.NOT_YET_CONNECTED || connectionStatus === STATUSES.DISCONNECTED) {
            return reject(new FtpConnectionError("can't end connection when connection status is: " + connectionStatus));
          }
          connectionStatus = STATUSES.DISCONNECTING;
          client.once('close', function(hadError) {
            return resolve(hadError ? lastError || true : false);
          });
          return client.end();
        });
      };
      this.destroy = function() {
        var wasDisconnected;
        if (connectionStatus === STATUSES.NOT_YET_CONNECTED || connectionStatus === STATUSES.DISCONNECTED) {
          wasDisconnected = true;
        } else {
          wasDisconnected = false;
          connectionStatus = STATUSES.DISCONNECTING;
        }
        client.destroy();
        return wasDisconnected;
      };
      this.getConnectionStatus = function() {
        return connectionStatus;
      };
      this.site = function(command) {
        return promisifiedClientMethods.site(command).spread(function(text, code) {
          return {
            text: text,
            code: code
          };
        });
      };
      this.cwd = function(dir) {
        return promisifiedClientMethods.cwd(dir).then(function(result) {
          if (dir.charAt(0) === '/') {
            intendedCwd = path.normalize(dir);
          } else {
            intendedCwd = path.join(intendedCwd, dir);
          }
          return result;
        });
      };
      this.cdup = function() {
        return promisifiedClientMethods.cdup().then(function(result) {
          intendedCwd = path.join(intendedCwd, '..');
          return result;
        });
      };
      commonLogicFactory = function(name, handler) {
        promisifiedClientMethods[name] = function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return new Promise(function(resolve, reject) {
            var onError;
            onError = function(err) {
              return reject(err);
            };
            client.once('error', onError);
            return client[name].apply(client, slice.call(args).concat([function(err, res) {
              client.removeListener('error', onError);
              if (err) {
                return reject(err);
              } else {
                return resolve(res);
              }
            }]));
          });
        };
        if (!handler) {
          handler = promisifiedClientMethods[name];
        }
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return Promise.resolve().then((function(_this) {
            return function() {
              if (unexpectedClose && autoReconnect && !autoReconnectPromise) {
                autoReconnectPromise = _connect(STATUSES.RECONNECTING)["catch"](function(err) {
                  throw new FtpReconnectError(closeError, err, false);
                }).then(function() {
                  if (preserveCwd) {
                    return promisifiedClientMethods.cwd(intendedCwd)["catch"]((function(_this) {
                      return function(err) {
                        _this.destroy();
                        throw new FtpReconnectError(closeError, err, true);
                      };
                    })(this));
                  } else {
                    return intendedCwd = '.';
                  }
                });
              }
              if (autoReconnectPromise) {
                return autoReconnectPromise;
              } else if (connectionStatus !== STATUSES.CONNECTED) {
                throw new FtpConnectionError("can't perform '" + name + "' command when connection status is: " + connectionStatus);
              }
            };
          })(this)).then(function() {
            return handler.apply(null, args);
          });
        };
      };
      for (i = 0, len = simplePassthroughMethods.length; i < len; i++) {
        name = simplePassthroughMethods[i];
        this[name] = commonLogicFactory(name);
      }
      for (j = 0, len1 = complexPassthroughMethods.length; j < len1; j++) {
        name = complexPassthroughMethods[j];
        this[name] = commonLogicFactory(name, this[name]);
      }
    }

    ref = [simplePassthroughMethods, complexPassthroughMethods, otherPrototypeMethods];
    for (i = 0, len = ref.length; i < len; i++) {
      methodList = ref[i];
      for (j = 0, len1 = methodList.length; j < len1; j++) {
        methodName = methodList[j];
        PromiseFtp.prototype[methodName] = null;
      }
    }

    return PromiseFtp;

  })();

  module.exports = PromiseFtp;

}).call(this);
