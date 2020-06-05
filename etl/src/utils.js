const cenUtil = require('@cennznet/util')
const api = require('@cennznet/api')

function getEventType(e) {
    return e.event.section + '.' + e.event.method;
}

async function getExtrinsicType(ex) {
    const { method, section } = api.Call.findCall(ex.method.callIndex)
    return section + '.' + method;
}

function stripTrailingZero(value) {
    let endPos = value.length - 1;
    for (let i = endPos; i > -1; i--) {
        if (value[i] !== 0) {
            endPos = i;
            break;
        }
    }
    return value.slice(0, endPos + 1);
}

function isAscii(s) {
    return /^[\x20-\x7F]*$/.test(s);
}

function u256ToString(data) {
    const u8a = stripTrailingZero(data);
    let str = cenUtil.u8aToString(u8a);
    if (!isAscii(str)) {
        str = null;
    }
    return str;
}

module.exports = {getEventType, getExtrinsicType, u256ToString}
