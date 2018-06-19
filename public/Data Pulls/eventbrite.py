import requests
import json


class eventBrite():
    """
    Grab events from EventBrite
    """

    def __init__(self):
        self.base_url = "https://www.eventbriteapi.com/v3/"
        self.token = "?token=TEBVRVJTULLCGBTZSHSI"
        self.raw_token = "TEBVRVJTULLCGBTZSHSI"

    def categories(self):
        """
        Grab all available categories
        """
        ep = self.base_url + "categories/" + self.token
        r = requests.get(ep, verify=True)
        categories = []
        if (r.status_code == 200):
            cats = dict({})
            l_ = r.json()["categories"]
            count = 0
            for category in l_:
                count += 1
                if (category["name"] != None):
                    categories.append((category["name"], category["id"]))
                    d_ = {
                        "category": category["name"],
                        "id": category["id"]
                    }
                    cats[category["name"]] = d_
            cats["category_count"] = count
            return cats, categories

    def events(self, city="Irvine", within="10", categoryID="", category=""):
        """
        Grab all events in area, within specified radius
        """
        ep = self.base_url + "events/search/" + self.token + "&location.address=" + city + "&location.within=" + str(within) + "mi" + "&categories=" + str(categoryID)
        r = requests.get(ep, verify=True)
        if (r.status_code == 200):
            events = dict({})
            events["id"] = categoryID
            pages = int(r.json()["pagination"]["page_count"])
            for x in range(pages):
                ep = self.base_url + "events/search/" + self.token + "&location.address=" + city + "&page=" + str(x) + "&location.within=" + str(within) + "mi" + "&categories=" + str(categoryID)
                l_ = r.json()["events"]
                count = 0
                for event in l_:
                    count += 1
                    d_ = {
                            "name": event["name"]["text"],
                            "start_time": event["start"]["local"],
                            "end_time": event["end"]["local"],
                            "url": event["url"],
                            "alive": event["status"],
                            "description": event["description"]["text"]
                    }
                    title = event["name"]["text"].translate(str.maketrans('','','$#[]/.'))
                    events[title] = d_
            events["events_count"] = count
            return events
    

    def writeJson(self, l_, name):
        """
        convert list called {l_} to JSON file called {name}
        """
        with open(name, 'w') as f:
            json.dump(l_, f)


if __name__ == "__main__":
    print("Categorizing...")
    p = eventBrite()
    _,categories = p.categories()

    print("Collecting event data...")
    events = dict({})
    for cat, ids in categories:
        events[cat] = p.events(categoryID = ids, category = cat)

    print("Writing JSON...")
    p.writeJson(p.categories(), "d.json")
    p.writeJson(events, "events.json")

    print("Complete")
