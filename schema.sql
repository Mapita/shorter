drop schema if exists "shorter" cascade;
create schema "shorter";

create domain "shorter"."apiKey" as varchar(128);

drop table if exists "shorter"."Links";
create table "shorter"."Links" (
    -- Unique ID for this link
    "linkId" serial not null,
    -- The shortened URL ending for this link
    "ending" varchar unique not null,
    -- The target URL for this link
    "url" varchar not null,
    -- The time at which this link was created
    "creationTime" timestamp not null default '1970-01-01 05:00:01',
    -- The last time that anyone modified this link
    "lastModifiedTime" timestamp not null default '1970-01-01 05:00:01',
    primary key("linkId")
);
create index "shorterLinkEndingIndex"
    on "shorter"."Links"("ending");

drop table if exists "shorter"."LinkEndings";
create table "shorter"."LinkEndings" (
    -- An available shortened URL ending for a prospective shortlink
    "ending" varchar unique not null,
    -- The time at which this ending was added to the queue
    "creationTime" timestamp not null default '1970-01-01 05:00:01',
    primary key("ending")
);

drop table if exists "shorter"."LinkTags";
create table "shorter"."LinkTags" (
    -- The link ID that this tag applies to
    "linkId" int not null,
    -- The name of this tag
    "tagName" varchar not null,
    primary key("linkId", "tagName")
);

drop table if exists "shorter"."Clicks";
create table "shorter"."Clicks" (
    -- ID of the link that was clicked
    "linkId" int not null,
    -- The shortened URL ending that was clicked
    "ending" varchar not null,
    -- The target URL that was visited
    "url" varchar not null,
    -- The time at which this click occured
    "clickTime" timestamp not null default '1970-01-01 05:00:01',
    -- The country in which the click occurred (if known)
    -- e.g. "Finland"
    "countryCode" varchar default null,
    "countryName" varchar default null,
    -- The region in which the click occurred (if known)
    -- e.g. "Uusimaa"
    "regionCode" varchar default null,
    "regionName" varchar default null,
    -- The zip/postal code where the click occurred (if known)
    -- e.g. 00100
    "postalCode" varchar default null,
    -- The city in which the click occurred (if known)
    -- e.g. "Helsinki"
    "city" varchar default null,
    -- The approximate latitute, longitude where the click occurred (if known)
    -- e.g. (60.1756, 24.9342)
    "latitude" real default null,
    "longitude" real default null,
    -- Page URL where a click-through occurred (if any, and if known)
    "referrerUrl" varchar default null,
    -- Secure hash of the IP address and user agent of the browser which
    -- generated this click.
    "identifyingHash" varchar default null
);
create index "shorterClickLinkIdIndex"
    on "shorter"."Clicks"("linkId");
create index "shorterClickTimeIndex"
    on "shorter"."Clicks"("clickTime");
create index "shorterClickIpHashIndex"
    on "shorter"."Clicks"("identifyingHash");
