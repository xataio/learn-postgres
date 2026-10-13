const XATA_UTM_PARAMS = {
  utm_source: "learn-database-tech",
  utm_medium: "referral",
  utm_campaign: "learn-postgres",
} as const;

export const withXataUtm = (href: string) => {
  const url = new URL(href);
  Object.entries(XATA_UTM_PARAMS).forEach(([name, value]) => {
    url.searchParams.set(name, value);
  });
  return url.toString();
};

export const XATA_HOME_URL = withXataUtm("https://xata.io");
