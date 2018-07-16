import stripePackage from "stripe";
import { calculateCost } from "./libs/billing-lib";
import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
import uuid from "uuid";

export async function main(event, context, callback) {
    const { storage, source } = JSON.parse(event.body);
    const amount = calculateCost(storage);
    const description = "Scratch charge";

    // Load our secret key from the  environment variables
    const stripe = stripePackage(process.env.stripeSecretKey);
    const params = {
        TableName: process.env.BILLINGS_TABLE,
        Item: {
            userId: event.requestContext.identity.cognitoIdentityId,
            storage: storage,
            source: source,
            amount: amount,
            createdAt: Date.now()
        }
    };
    try {
        await stripe.charges.create({
            source,
            amount,
            description,
            currency: "usd"
        });
        await dynamoDbLib.call("put", params);
        callback(null, success(params.Item));
    } catch (e) {
        callback(null, failure({ message: e.message }));
    }
}