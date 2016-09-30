/*
 * Copyright (c) 2016 VMware, Inc. All Rights Reserved.
 *
 * This product is licensed to you under the Apache License, Version 2.0 (the "License").
 * You may not use this product except in compliance with the License.
 *
 * This product may include a number of subcomponents with separate copyright notices
 * and license terms. Your use of these subcomponents is subject to the terms and
 * conditions of the subcomponent's license, as noted in the LICENSE file.
 */

package main

import (
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
)

func dialFactory(socketPath string) func(network, addr string) (net.Conn, error) {
	return func(proto, addr string) (conn net.Conn, err error) {
		return net.Dial("unix", socketPath)
	}
}

type SilentProxyWriter int

func (SilentProxyWriter) Write(b []byte) (int, error) {
	if !strings.Contains(string(b), "request canceled") {
		return os.Stdout.Write(b)
	} else {
		// Ignore logging canceled requests. Shellinabox's UI sets timeout of 30 seconds
		// for every polling request, so it is common when the proxy is canceled
		// to show error in the log, we ignore it.
		return 0, nil
	}
}

var silentProxyLogger = log.New(new(SilentProxyWriter), "", 0)

func ProxyToSocket(w http.ResponseWriter, r *http.Request, socketPath string, urlPath string) {

	proxy := &httputil.ReverseProxy{}

	proxy.Transport = &http.Transport{
		Dial: dialFactory(socketPath),
	}

	proxy.Director = func(newreq *http.Request) {
		newreq.URL.Scheme = "http"
		newreq.URL.Host = r.Host
		newreq.URL.Path = urlPath
	}

	proxy.ErrorLog = silentProxyLogger
	proxy.ServeHTTP(w, r)
}
