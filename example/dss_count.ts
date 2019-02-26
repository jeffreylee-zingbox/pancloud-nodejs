import { EmbeddedCredentials, DirectorySyncService, LogLevel } from 'pancloud-nodejs'
import { c_id, c_secret, r_token, a_token } from './secrets'
import { DssObjClass } from 'pancloud-nodejs/lib/directorysyncservice';

const entryPoint = "https://api.us.paloaltonetworks.com"

export async function main(): Promise<void> {
    let c = await EmbeddedCredentials.factory({
        clientId: c_id,
        clientSecret: c_secret,
        refreshToken: r_token,
        accessToken: a_token
    })
    let dss = await DirectorySyncService.factory(entryPoint, {
        credential: c
        // level: LogLevel.DEBUG
    })
    console.log("Retrieving count per object classes")
    for (let i of ["computers", "containers", "groups", "users"]) {
        let count = await dss.count("panwdomain", i as DssObjClass)
        console.log(`${i}: ${count}`)
    }
}