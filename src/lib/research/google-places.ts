import type { ResearchPlaceMatch } from "@/lib/research/types";

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
  }>;
  error?: { message?: string };
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  reviews?: Array<{ text?: { text?: string }; publishTime?: string }>;
};

export type GooglePlaceSnapshot = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  latestReviewSnippet: string | null;
  locationMatchCount: number;
};

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }
  return key;
}

export async function searchGooglePlaces(
  query: string
): Promise<ResearchPlaceMatch[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 5,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data = (await response.json()) as PlacesSearchResponse;
  if (!response.ok) {
    throw new Error(
      data.error?.message ??
        `Google Places search failed with status ${response.status}`
    );
  }

  return (data.places ?? [])
    .filter(
      (place): place is NonNullable<PlacesSearchResponse["places"]>[number] & {
        id: string;
        displayName: { text: string };
        formattedAddress: string;
      } =>
        typeof place.id === "string" &&
        typeof place.displayName?.text === "string" &&
        typeof place.formattedAddress === "string"
    )
    .map((place) => ({
      placeId: place.id,
      displayName: place.displayName.text,
      formattedAddress: place.formattedAddress,
      rating: typeof place.rating === "number" ? place.rating : null,
      userRatingCount:
        typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    }));
}

export async function getGooglePlaceSnapshot(input: {
  placeId: string;
  searchName: string;
}): Promise<GooglePlaceSnapshot> {
  const apiKey = getApiKey();

  const [detailsRes, searchMatches] = await Promise.all([
    fetch(`https://places.googleapis.com/v1/places/${input.placeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,rating,userRatingCount,websiteUri,reviews",
      },
      signal: AbortSignal.timeout(30_000),
    }),
    searchGooglePlaces(input.searchName),
  ]);

  const details = (await detailsRes.json()) as PlaceDetailsResponse & {
    error?: { message?: string };
  };
  if (!detailsRes.ok) {
    throw new Error(
      details.error?.message ??
        `Google Place details failed with status ${detailsRes.status}`
    );
  }

  if (
    typeof details.id !== "string" ||
    typeof details.displayName?.text !== "string" ||
    typeof details.formattedAddress !== "string"
  ) {
    throw new Error("Google Place details response was incomplete");
  }

  const reviewText = details.reviews?.[0]?.text?.text;

  return {
    placeId: details.id,
    displayName: details.displayName.text,
    formattedAddress: details.formattedAddress,
    rating: typeof details.rating === "number" ? details.rating : null,
    userRatingCount:
      typeof details.userRatingCount === "number" ? details.userRatingCount : null,
    websiteUri: typeof details.websiteUri === "string" ? details.websiteUri : null,
    latestReviewSnippet:
      typeof reviewText === "string" && reviewText.trim()
        ? reviewText.trim().slice(0, 240)
        : null,
    locationMatchCount: searchMatches.length,
  };
}
