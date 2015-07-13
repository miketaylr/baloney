/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Full Screen Mobile Add-on.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * * Matt Brubeck <mbrubeck@mozilla.com>
 * * Mike Taylor  <miket@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://baloney/locale/baloney.properties");
});

const prefName = "general.useragent.override";
let gWin;

function isNativeUI() {
  let appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
  return (appInfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

let Phony = {
  set useragent(value) {
    if (value)
      Services.prefs.setCharPref(prefName, value);
    else if (Services.prefs.prefHasUserValue(prefName))
      Services.prefs.clearUserPref(prefName);
  },

  get useragent() {
    return Services.prefs.prefHasUserValue(prefName)
         ? Services.prefs.getCharPref(prefName) : "";
  }
};

let gMenuId = null;
let gStringBundle = null;

// This should be kept in sync with the values in locale/*/phony.properties
let uas = [
  ["Default Firefox for Android", ""],
  ["No Android version token", "Mozilla/5.0 (Android; Mobile; rv: 40.0) Gecko/40.0 Firefox/40.0"],
  ["AppleWebKit token", "Mozilla/5.0 (Android; Mobile; rv: 40.0) AppleWebKit/537.36 Gecko/40.0 Firefox/40.0"],
  ["Mobile Safari token", "Mozilla/5.0 (Android; Mobile; rv: 40.0) Mobile Safari Gecko/40.0 Firefox/40.0"],
  ["WebKit token + Android 4.4.4 version token", "Mozilla/5.0 (Android 4.4.4; Mobile; rv: 40.0) AppleWebKit/537.36 Gecko/40.0 Firefox/40.0"],
  ["Chrome Mobile UA", "Mozilla/5.0 (Linux; Android 4.4.4; A00001 Build/KTU84Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.108 Mobile Safari/537.36"],
  ["SH-01G", "Mozilla/5.0 (Android 4.4.4; Mobile; SH-01G Build/S4020; rv:40.0) Gecko/40.0 Firefox/40.0"],
  ["SO-02G", "Mozilla/5.0 (Android 4.4.4; Mobile; SO-02G Build/23.0.B.1.38; rv:40.0) Gecko/40.0 Firefox/40.0"],
];

function init(aEvent) {
  if (this.selectedPanel.id != "prefs-container")
    return;

  let document = this.ownerDocument;
  let menu = document.getElementById("phony-useragent-menu");

  if (!menu) {
    // Create the menu.
    let setting = document.createElement("setting");
    setting.setAttribute("id", "phony-useragent-setting");
    setting.setAttribute("type", "control");
    setting.setAttribute("title", "User Agent");
    document.getElementById("prefs-list").insertBefore(setting, document.getElementById("prefs-sync"));

    menu = document.createElement("menulist");
    menu.setAttribute("id", "phony-useragent-menu");
    setting.appendChild(menu);
  }

  // At this point (on Android devices only?), appending items to the menu does
  // not work.  It seems the XBL binding is not always available immediately,
  // so we need a timeout before using it.
    if (!menu.firstChild || !menu.firstChild.hasChildNodes) {
      for (let i=0; i<uas.length; i++) {
        let [label, value] = uas[i];
        menu.appendItem(label, value); // XXX not available until XBL kicks in
      }
      menu.addEventListener("select", function() Phony.useragent = menu.selectedItem.value, false);
    }

    let item = menu.getElementsByAttribute("value", Phony.useragent)[0];
    if (!item)
      item = menu.appendItem("Custom", Phony.useragent);
    menu.selectedItem = item;
}

function initUAList() {
  let uaItemLabel, uaItemValue = null;

  for (let i=0; i<uas.length; i++) {
    try {
      uaItemLabel = Strings.GetStringFromName("phony.uas." + i);
      uaItemValue = Strings.GetStringFromName("phony.uas." + i + ".value");
      if (uaItemLabel) {
        uas[i] = [uaItemLabel, uaItemValue];
      }
    } catch (e) { Cu.reportError(e); }
  }
}

function selectUA() {
  let labels = [];
  let values = [];
  let found = false;

  for (let i = 0; i < uas.length; i++) {
    let [label, value] = uas[i];
    if (value == Phony.useragent) {
      found = true;
      labels.unshift(label);
      values.unshift(value);
    } else {
      labels.push(label);
      values.push(value);
    }
  }

  if (!found) {
    labels.push("Custom");
    values.push(Phony.useragent);
  }

  let res = { value: 0 };
  let selectTitleString = Strings.GetStringFromName("phony.name");
  let selectMsgString = Strings.GetStringFromName("phony.selectMsg");
  if (Services.prompt.select(null, selectTitleString, selectMsgString, labels.length, labels, res))
    Phony.useragent = values[res.value];
}

function load(win) {
  initUAList();

  gWin = win;
  if (isNativeUI()) {
    gMenuId = win.NativeWindow.menu.add("Baloney", null, selectUA);
  } else {
    let panels = win.document.getElementById("panel-items");
    panels.addEventListener("select", init, false);
  }
}

function unload(win) {
  if (isNativeUI()) {
    win.NativeWindow.menu.remove(gMenuId);
  } else {
    let setting = win.document.getElementById("phony-useragent-setting");
    if (setting)
      setting.parentNode.removeChild(setting);
    win.document.getElementById("panel-items").removeEventListener("select", init, false);
  }
  Phony.useragent = null;
}

var listener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    win.addEventListener("UIReady", function onReady(aEvent) {
      win.removeEventListener("UIReady", onReady, false);
      load(win);
    }, false);
  },

  // Unused:
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { }
};

/* Bootstrap Interface */

function startup(aData, aReason) {
  // Load in existing windows.
  let enumerator = Services.wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    load(win);
  }

  // Load in future windows.
  Services.wm.addListener(listener);
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;

  Services.wm.removeListener(listener);

  let enumerator = Services.wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    unload(win);
  }
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}
