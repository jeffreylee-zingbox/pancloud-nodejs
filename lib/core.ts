/**
 * Implements the abstract coreClass that implements common methods for higher-end classes like Event Service
 * and Logging Service
 */
import * as fetch from 'node-fetch'
import { Credentials } from './credentials'
import { ApplicationFrameworkError, PanCloudError } from './error'
import { EventEmitter } from 'events'
import { LOGTYPE, commonLogger, logLevel, retrier } from './common';

const EVENT_EVENT = 'EVENT_EVENT'
const PCAP_EVENT = 'PCAP_EVENT'
const CORRELATION_EVENT = 'CORRELATION_EVENT'
type eventTypes = typeof EVENT_EVENT | typeof PCAP_EVENT | typeof CORRELATION_EVENT

/**
 * coreClass supports "async operations". In this mode, events received by the Framework will be send to its
 * subscribers. Emitted events will be conformant to this interface.
 */
export interface emittedEvent {
    source: string,
    logType?: LOGTYPE,
    event?: any[]
}

/**
 * Interface to provide configuration options to the core class
 */
export interface coreOptions {
    /**
     * credential object that should be used in the coreClass instance
     */
    credential: Credentials,
    /**
     * Master API entry point to be used by the coreClass instance
     */
    entryPoint: string,
    /**
     * Toggle the access_token auto-refresh feature
     */
    autoRefresh?: boolean,
    /**
     * If true, the coreClass instance will accept the user register the same callback multiple times
     */
    allowDup?: boolean,
    /**
     * Minimum level of logs that should be generated by the coreClass
     */
    level?: logLevel
    /**
     * Number of times a fetch operation must be retried in case of exception
     */
    retrierCount?: number
    /**
     * Delay (in milliseconds) between retry attempts
     */
    retrierDelay?: number
}

/**
 * This class should not be used directly. It is meant to be extended. Use higher-level classes like LoggingService
 * or EventService
 */
export class coreClass {
    /**
     * Hosts the EventEmitter object that will be used in async operations
     */
    protected emitter: EventEmitter
    /**
     * Credential object to be used by this instance
     */
    protected cred: Credentials
    /**
     * Master Application Framework API entry point
     */
    protected entryPoint: string
    /**
     * Keeps the HTTP headers used by the user agent. mainly used to keep the Authorization header (bearer access token)
     */
    protected fetchHeaders: { [i: string]: string }
    private autoR: boolean
    private allowDupReceiver: boolean
    private notifier: { [event: string]: boolean }
    private retrierCount?: number
    private retrierDelay?: number
    lastResponse: any
    public className: string

    /**
     * 
     * @param ops configuration options for this instance
     */
    protected constructor(ops: coreOptions) {
        this.className = "coreClass"
        this.cred = ops.credential
        this.entryPoint = ops.entryPoint
        this.allowDupReceiver = (ops.allowDup == undefined) ? false : ops.allowDup
        this.newEmitter()
        if (ops.level != undefined && ops.level != logLevel.INFO) {
            commonLogger.level = ops.level
        }
        if (ops.autoRefresh == undefined) {
            this.autoR = true
        } else {
            this.autoR = ops.autoRefresh
        }
        this.retrierCount = ops.retrierCount
        this.retrierDelay = ops.retrierDelay
        this.setFetchHeaders()
    }

    private registerListener(event: eventTypes, l: (...args: any[]) => void): boolean {
        if (this.allowDupReceiver || !this.emitter.listeners(event).includes(l)) {
            this.emitter.on(event, l)
            this.notifier[event] = true
            return true
        }
        return false
    }

    private unregisterListener(event: eventTypes, l: (...args: any[]) => void): void {
        this.emitter.removeListener(event, l)
        this.notifier[event] = (this.emitter.listenerCount(event) > 0)
    }

    /**
     * Register new listeners to the 'event' topic. Enforces listener duplicate check
     * @param l listener
     * @returns true is the listener is accepted. False otherwise (duplicated?)
     */
    protected registerEvenetListener(l: (e: emittedEvent) => void): boolean {
        return this.registerListener(EVENT_EVENT, l)
    }

    /**
     * Unregisters a listener from the 'event' topic.
     * @param l listener
     */
    protected unregisterEvenetListener(l: (e: emittedEvent) => void): void {
        this.unregisterListener(EVENT_EVENT, l)
    }

    /**
     * @ignore To Be Implemented
     */
    protected registerCorrelationListener(l: (e: boolean) => void): boolean {
        return this.registerListener(CORRELATION_EVENT, l)
    }

    /**
     * @ignore To Be Implemented
     */
    protected unregisterCorrelationListener(l: (e: boolean) => void): void {
        this.unregisterListener(CORRELATION_EVENT, l)
    }

    /**
     * @ignore To Be Implemented
     */
    protected registerPcapListener(l: (e: boolean) => void): boolean {
        return this.registerListener(PCAP_EVENT, l)
    }

    /**
     * @ignore To Be Implemented
     */
    protected unregisterPcapListener(l: (e: boolean) => void): void {
        this.unregisterListener(PCAP_EVENT, l)
    }

    protected newEmitter(ee?: (e: emittedEvent) => void, pe?: (arg: boolean) => void, ce?: (arg: boolean) => void) {
        this.emitter = new EventEmitter()
        this.notifier = { EVENT_EVEN: false, PCAP_EVENT: false, CORRELATION_EVENT: false }
        if (ee) {
            this.registerEvenetListener(ee)
        }
        if (pe) {
            this.registerPcapListener(pe)
        }
        if (ce) {
            this.registerCorrelationListener(ce)
        }
    }

    /**
     * Used to send an event to all subscribers in the 'event' topic
     * @param e the event to be sent
     */
    protected emitEvent(e: emittedEvent): void {
        if (this.notifier[EVENT_EVENT]) {
            if (!(e.event)) {
            }
            this.emitter.emit(EVENT_EVENT, e)
        }
    }

    /**
     * Prepares the HTTP headers. Mainly used to keep the Autorization header (bearer access-token)
     */
    private setFetchHeaders(): void {
        this.fetchHeaders = {
            'Authorization': 'Bearer ' + this.cred.get_access_token(),
            'Content-Type': 'application/json'
        }
        commonLogger.info(this, 'updated authorization header')
    }

    /**
     * Triggers the credential object access-token refresh procedure and updates the HTTP headers
     */
    protected async refresh(): Promise<void> {
        await this.cred.refresh_access_token()
        this.setFetchHeaders()
    }

    private async checkAutoRefresh(): Promise<void> {
        if (this.autoR) {
            if (await this.cred.autoRefresh()) {
                this.setFetchHeaders()
            }
        }
    }

    private async fetchXWrap(url: string, method: string, body?: string, timeout?: number): Promise<any> {
        await this.checkAutoRefresh()
        let rinit: fetch.RequestInit = {
            headers: this.fetchHeaders,
            method: method
        }
        if (timeout) {
            rinit.timeout = timeout
        }
        if (body) {
            rinit.body = body
        }
        commonLogger.debug(this, `fetch operation to ${url}`, method, body)
        let r = await retrier(this, undefined, undefined, fetch.default, url, rinit)
        let r_text = await r.text()
        if (r_text.length == 0) {
            commonLogger.info(this, 'fetch response is null')
            return null
        }
        let r_json: any
        try {
            r_json = JSON.parse(r_text)
        } catch (exception) {
            throw new PanCloudError(this, 'PARSER', `Invalid JSON: ${exception.message}`)
        }
        if (!r.ok) {
            commonLogger.alert(this, r_text, "FETCHXWRAP")
            throw new ApplicationFrameworkError(this, r_json)
        }
        commonLogger.debug(this, 'fetch response', undefined, r_json)
        return r_json
    }

    /**
     * Convenience method that abstracts a GET operation to the Application Framework. Captures both non JSON responses
     * as well as Application Framework errors (non-200) throwing exceptions in both cases.
     * @param url URL to be called
     * @param timeout milliseconds before issuing a timeout exeception. The operation is wrapped by a 'retrier'
     * that will retry the operation. User can change default retry parameters (3 times / 100 ms) using the right
     * class configuration properties
     * @returns the object returned by the Application Framework
     */
    protected async fetchGetWrap(url: string, timeout?: number): Promise<any> {
        return await this.fetchXWrap(url, "GET", undefined, timeout)
    }

    /**
     * Convenience method that abstracts a POST operation to the Application Framework
     */
    protected async fetchPostWrap(url: string, body?: string, timeout?: number): Promise<any> {
        return await this.fetchXWrap(url, "POST", body, timeout)
    }

    /**
     * Convenience method that abstracts a PUT operation to the Application Framework
     */
    protected async fetchPutWrap(url: string, body?: string, timeout?: number): Promise<any> {
        return await this.fetchXWrap(url, "PUT", body, timeout)
    }

    /**
     * Convenience method that abstracts a DELETE operation to the Application Framework
     */
    protected async fetchDeleteWrap(url: string, timeout?: number): Promise<any> {
        return await this.fetchXWrap(url, "DELETE", undefined, timeout)
    }

    /**
     * Convenience method that abstracts a DELETE operation to the Application Framework
     */
    protected async void_X_Operation(url: string, payload?: string, method = "POST"): Promise<void> {
        let r_json = await this.fetchXWrap(url, method, payload);
        this.lastResponse = r_json
    }
}