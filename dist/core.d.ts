/**
 * Implements the abstract coreClass that implements common methods for higher-end classes like Event Service
 * and Logging Service
 */
import { HttpMethod } from './fetch';
import { Credentials } from './credentials';
import { LogLevel } from './common';
/**
 * Core class runtime statistic metrics
 */
export interface CoreStats {
    /**
     * The number of API transactions completed
     */
    apiTransactions: number;
}
/**
 * Interface to provide configuration options to the core class
 */
export interface CoreOptions {
    /**
     * credential object that should be used in the coreClass instance
     */
    credential: Credentials;
    /**
     * Toggle the access_token auto-refresh feature
     */
    autoRefresh?: boolean;
    /**
     * Minimum level of logs that should be generated by the coreClass
     */
    level?: LogLevel;
    /**
     * Number of times a fetch operation must be retried in case of exception
     */
    retrierCount?: number;
    /**
     * Delay (in milliseconds) between retry attempts
     */
    retrierDelay?: number;
    /**
     * If provided, the underlying `fetch` module will use this value as request timeout
     */
    fetchTimeout?: number | undefined;
}
/**
 * This class should not be used directly. It is meant to be extended. Use higher-level classes like LoggingService
 * or EventService
 */
export declare class CoreClass {
    /**
     * Credential object to be used by this instance
     */
    protected cred: Credentials;
    /**
     * Master Application Framework API entry point
     */
    protected baseUrl: string;
    /**
     * Keeps the HTTP headers used by the user agent. mainly used to keep the Authorization header (bearer access token)
     */
    protected fetchHeaders: {
        [i: string]: string;
    };
    private fetchTimeout;
    private autoR;
    private retrierCount?;
    private retrierDelay?;
    lastResponse: any;
    className: string;
    protected stats: CoreStats;
    /**
     *
     * @param ops configuration options for this instance
     */
    protected constructor(baseUrl: string, ops: CoreOptions);
    /**
     * Prepares the HTTP headers. Mainly used to keep the Autorization header (bearer access-token)
     */
    private setFetchHeaders;
    /**
     * Triggers the credential object access-token refresh procedure and updates the HTTP headers
     */
    protected refresh(): Promise<void>;
    private checkAutoRefresh;
    private fetchXWrap;
    /**
     * Convenience method that abstracts a GET operation to the Application Framework. Captures both non JSON responses
     * as well as Application Framework errors (non-200) throwing exceptions in both cases.
     * @param url URL to be called
     * @param timeout milliseconds before issuing a timeout exeception. The operation is wrapped by a 'retrier'
     * that will retry the operation. User can change default retry parameters (3 times / 100 ms) using the right
     * class configuration properties
     * @returns the object returned by the Application Framework
     */
    protected fetchGetWrap(path?: string): Promise<any>;
    /**
     * Convenience method that abstracts a POST operation to the Application Framework
     */
    protected fetchPostWrap(path?: string, body?: string): Promise<any>;
    /**
     * Convenience method that abstracts a PUT operation to the Application Framework
     */
    protected fetchPutWrap(path?: string, body?: string): Promise<any>;
    /**
     * Convenience method that abstracts a DELETE operation to the Application Framework
     */
    protected fetchDeleteWrap(path?: string): Promise<any>;
    /**
     * Convenience method that abstracts a DELETE operation to the Application Framework
     */
    protected voidXOperation(path?: string, payload?: string, method?: HttpMethod): Promise<void>;
}
