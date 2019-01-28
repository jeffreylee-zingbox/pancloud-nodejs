/**
 * High level abstraction of the Application Framework Event Service
 */
import { LOGTYPE } from './common';
import { coreClass, emittedEvent, coreOptions } from './core';
/**
 * Event Service emitted message interface
 */
interface esEvent {
    logType: LOGTYPE;
    event: any[];
}
/**
 * Interface that describes an Event Service filter
 */
export interface esFilter {
    filters: {
        [index: string]: {
            filter: string;
            timeout?: number;
            batchSize?: number;
        };
    }[];
    flush?: boolean;
}
interface esPollOptions {
    pollTimeout: number;
    fetchTimeout: number;
    ack: boolean;
}
interface esFilterOptions {
    eventCallBack?(e: emittedEvent): void;
    correlationCallBack?(): void;
    pcapCallBack?(): void;
    sleep?: number;
    poolOptions?: esPollOptions;
}
/**
 * Interface that describes a valid Event Service filter configuration
 */
export interface esFilterCfg {
    filter: esFilter;
    filterOptions: esFilterOptions;
}
/**
 * High level interface to build a valid {@link esFilterCfg} object using the {@link EventService.filterBuilder} method
 */
export interface esFilterBuilderCfg {
    filter: {
        table: LOGTYPE;
        where?: string;
        timeout?: number;
        batchSize?: number;
    }[];
    filterOptions: esFilterOptions;
    flush?: boolean;
}
export interface esOptions {
    channelId?: string;
}
/**
 * High-level class that implements an Application Framework Event Service client. It supports both sync
 * and async features. Objects of this class must be obtained using the factory static method
 */
export declare class EventService extends coreClass {
    private filterUrl;
    private pollUrl;
    private ackUrl;
    private nackUrl;
    private flushUrl;
    private popts;
    private ap_sleep;
    private tout;
    private polling;
    private eevent;
    private constructor();
    private setChannel;
    /**
     * Static factory method to instantiate an Event Service object
     * @param esOps Instantitation configuration object accepting parameters from {@link core.coreOptions} and
     * {@link esOptions}
     * @returns an instantiated {@link EventService} object
     */
    static factory(esOps: esOptions & coreOptions): EventService;
    /**
     * @returns the current Event Service filter configuration
     */
    getFilters(): Promise<esFilter>;
    /**
     * Sets a new Event Service configuration
     * @param fcfg The new service configuration. If the configuration includes a valid callBack handler (currently
     * only {@link esFilterCfg.filterOptions.eventCallBack} is supported) then the class AutoPoll feature is turned on
     * @returns a promise to the current Event Service to ease promise chaining
     */
    setFilters(fcfg: esFilterCfg): Promise<EventService>;
    /**
     * Convenience function to set a valid {@link esFilterCfg} configuration in the Event Service using a
     * description object
     * @param fbcfg The filter description object
     * @returns a promise to the current Event Service to ease promise chaining
     */
    filterBuilder(fbcfg: esFilterBuilderCfg): Promise<EventService>;
    /**
     * Sets an empty filter in the Event Service
     * @param flush Optinal `flush` attribute (defaults to `false`)
     * @returns a promise to the current Event Service to ease promise chaining
     */
    clearFilter(flush?: boolean): Promise<EventService>;
    /**
     * Performs an `ACK` operation on the Event Service
     */
    ack(): Promise<void>;
    /**
     * Performs a `NACK` operation on the Event Service
     */
    nack(): Promise<void>;
    /**
     * Performs a `FLUSH` operation on the Event Service
     */
    flush(): Promise<void>;
    /**
     * Performs a `POLL` operation on the Event Service
     * @returns a promise that resolves to an array of {@link esEvent} objects
     */
    poll(): Promise<esEvent[]>;
    private static autoPoll;
    /**
     * Stops this class AutoPoll feature for this Event Service instance
     */
    pause(): void;
    /**
     * (Re)Starts the AutoPoll feature for this Event Service instance. Typically the user won't start the
     * AutoPoll feature using this method but providing a valid callback in the {@link filterOptions} when calling
     * the method {@link EventService.setFilters}
     */
    resume(): void;
}
export {};