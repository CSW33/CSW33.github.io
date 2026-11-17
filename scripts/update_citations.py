"""Update the public citation snapshot using the OpenAlex Works API."""

import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SNAPSHOT = Path(__file__).resolve().parents[1] / "citations.json"
WORKS = {"ciallo": "W7225784688", "sure": "W7225637135", "xworld": "W7225205333"}
SLIM_TITLE = "Scalable Feature Matching via State Space Modeling and Sparse Correlation"


def fetch(path, **params):
    if key := os.getenv("OPENALEX_API_KEY"):
        params["api_key"] = key
    url = "https://api.openalex.org/works" + path + "?" + urlencode(params)
    request = Request(url, headers={"User-Agent": "CSW33-academic-homepage/1.0"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def find_slim():
    candidates = fetch("", filter="title.search:" + SLIM_TITLE,
                       select="id,display_name,authorships,cited_by_count")["results"]
    for work in candidates:
        authors = [item["author"]["display_name"].casefold() for item in work["authorships"]]
        if (work["display_name"].casefold() == SLIM_TITLE.casefold()
                and {"bo li"}.issubset(authors)
                and any(set(name.split()) == {"choo", "sin", "wai"} for name in authors)):
            return work
    return None


def main():
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    successes = 0
    for slug in [*WORKS, "slim"]:
        work_id = WORKS.get(slug) or snapshot.get(slug, {}).get("id")
        try:
            work = fetch("/" + work_id, select="id,cited_by_count") if work_id else find_slim()
            if work is None:
                snapshot.pop(slug, None)
            else:
                identifier = work["id"].rsplit("/", 1)[-1]
                count = work["cited_by_count"]
                if not re.fullmatch(r"W\d+", identifier) or type(count) is not int or count < 0:
                    raise ValueError("Invalid OpenAlex record")
                snapshot[slug] = {"id": identifier, "count": count}
            successes += 1
        except HTTPError as error:
            if error.code == 404:
                snapshot.pop(slug, None)
                successes += 1
            print(f"{slug}: OpenAlex HTTP {error.code}")
        except (URLError, TimeoutError, ValueError, KeyError) as error:
            print(f"{slug}: {type(error).__name__}, retaining previous result")
    if not successes:
        raise SystemExit("OpenAlex unavailable; previous snapshot retained")
    SNAPSHOT.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
