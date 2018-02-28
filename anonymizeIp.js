// Anonymize an input IP address and return the result.
// Supports both ipv4 and ipv6 inputs.
// See https://support.google.com/analytics/answer/2763052?hl=en
module.exports = function anonymizeIp(ip){
    if(ip.startsWith("::")){
        // ipv6 localhost special case
        return "::";
    }else if(ip.indexOf(".") >= 0){
        // ipv4 - erase the last octet
        const parts = ip.split(".");
        parts[3] = "0";
        return parts.join(".");
    }else{
        // ipv6 - erase the last 80 bits (retain only the site prefix)
        const parts = ip.split(":");
        if(parts.length <= 5){
            return ip;
        }else{
            return parts.slice(0, 4).join(":") + "::";
        }
    }
};
