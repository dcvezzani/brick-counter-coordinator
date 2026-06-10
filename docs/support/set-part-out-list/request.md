> **Canonical doc:** [bricklink-set-part-out-fetch.md](../../bricklink-set-part-out-fetch.md) — expanded from this raw capture.

This represents the service call that should be used to get a set part-out list for a given set id.

## Request
- session cookie should be provided by the browser
- the cookie value can either be provided by a user pasting the cookie value, making it available to the counter tool which can then make an AJAX call with the necessary session cookie
- or a feature should be added to the existing chrome extension to make the request to get the set part-out list, transform and then send to the part counter tool
```
curl 'https://www.bricklink.com/invSetEdit.asp' \
  -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -b '${sessionCookie}' \
  -H 'origin: https://www.bricklink.com' \
  -H 'pragma: no-cache' \
  -H 'priority: u=0, i' \
  -H 'referer: https://www.bricklink.com/invSet.asp?utm_content=subnav' \
  -H 'sec-ch-ua: "Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: document' \
  -H 'sec-fetch-mode: navigate' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sec-fetch-user: ?1' \
  -H 'upgrade-insecure-requests: 1' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \
  --data-raw 'itemType=S&sellerOptionCost=&sellerOptionMyWeight=&sellerOptionStock=&itemNo=21306&itemSeq=1&itemQty=1&breakType=M&breakSets=Y&itemCondition=N&itemPrice=I&itemRound=2&itemBulk=1&itemDesc=&itemRemarks=&TQ1=&TS1=&TQ2=&TS2=&TQ3=&TS3=&invDup=Y&invAdjustPrice=N&invAdjustBulk=O&invAdjustSale=O&invAdjustRemarks=N&invAdjustExtended=O&invAdjustStock=O&invAdjustRetain=O&invAdjustCost=O&invAdjustWeight=O&ItemInvSort=1&ItemInvAsc=A'
```

## Response
- see ./response.html
- this response will need to be transformed to JSON before the counting tool can consume it
