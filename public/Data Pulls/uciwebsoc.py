import requests
import re
import json
from bs4 import BeautifulSoup


class UCIWebSoc():
    """
    Pull data from the Official UCI Schedule of Classes
    """

    def __init__(self):
        self.base_url = "https://www.reg.uci.edu/perl/WebSoc/?"
        self.courses = dict({
                "UCI Courses": {
                    "Terms": {
                        "Winter 2018": {
                            "Department": {}}}}})

    def classes(self, dept):
        ep = self.base_url + "YearTerm=2018-03&Dept=" + dept
        r = requests.get(ep,verify=True)
        soup = BeautifulSoup(r.content, "html.parser")
        soup.prettify('utf-8')

        soup_content = soup.find_all(lambda tag: tag.name == 'tr')
            
        if(len(soup_content) == 0):
            return 0

        else:
            counter = 0
            courseIdentifier = ""
            courseName = ""
            courseDepartment = ""
    
            for sc in soup_content:
                content = re.sub('[^0-9a-zA-Z]+', ' ', sc.text.strip())

                if(counter == 2):
                    courseDepartment = content
                    self.courses["UCI Courses"]["Terms"]["Winter 2018"]["Department"][courseDepartment] = dict({})
                    self.courses["UCI Courses"]["Terms"]["Winter 2018"]["Department"][courseDepartment]["count"] = 0

                if(len(content) != 0 and courseDepartment != ""):
                    # Parsing through course logistics
                    if dept == ' '.join(content.split()[0:len(dept.split())]):
                        idx = len(dept.split())
                        courseIdentifier = ' '.join(content.split()[:idx + 1])
                        if(content.split()[-1] == 'Prerequisites'):
                            courseName = ' '.join(content.split()[idx + 1:-1]).title()
                        else:
                            courseName = ' '.join(content.split()[idx + 1:]).title()

                    # Parsing through each individual course's information
                    elif content[0].isdigit():
                        numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
                        buildings = ['RH', 'MSTB', 'HIB', 'SSLH', 'SSH', 'SH', 'HH', 'SSL', 'ICS', 'ICS2', 'ICF']
                        index = 0

                        for i in range(1, len(content.split())):
                            if(content.split()[i][0] in numbers):
                               index = i - 1
                               break

                        code = content.split()[:1][0][:5]
                        courseType = content.split()[:1][0][5:8]

                        if(courseType in ['Lec'] and 'TBA' not in content):
                            if(courseType == "Lec"):
                                courseType = "Lecture"

                            # Identifying the instructor
                            instructor = content.split()[1] + ". " + content.split()[:1][0][10:].title()

                            if(content.split()[0][10] in numbers):
                                instructor = content.split()[1] + ". " + content.split()[0][11:].title()

                            if(len(content.split()[1]) != 1):
                                instructor = content.split()[2] + ". " + content.split()[0][10:].title() + " " + content.split()[1].title()

                            # Identifying the meeting time
                            meetingTime = content.split()[index]
                            if("STAFF" in meetingTime):
                                meetingTime = meetingTime.split("STAFF")[1]
                        
                            startTime = ""
                            endTime = ""

                            # Identifying the start time/ end time/ location for evening courses
                            if("p" in content.split()[index + 4]):
                                if(content.split()[index + 3] == "12"):
                                    startTime = "2018-01-08T" + content.split()[index + 1] + ":" + content.split()[index + 2] + ":00"
                                    endTime = "2018-03-23T" + content.split()[index + 3] + ":" + content.split()[index + 4].split("p")[0] + ":00"

                                else:
                                    startTime = "2018-01-08T" + str(12 + int(content.split()[index + 1])) + ":" + content.split()[index + 2] + ":00"
                                    endTime = "2018-03-23T" + str(12 + int(content.split()[index + 3])) + ":" + content.split()[index + 4].split("p")[0] + ":00"
                                
                                if(content.split()[index + 4].split("p")[1] in buildings):
                                    location = content.split()[index + 4].split("p")[1] + ' ' + content.split()[index + 5][:3]
                                else:
                                    location = content.split()[index + 4].split("p")[1] + ' ' + content.split()[index + 5][:4] 

                            # Identifying the start time/ end time/ location for morning courses
                            else:
                                startTime = "2018-01-08T" + content.split()[index + 1] + ":" + content.split()[index + 2] + ":00"
                                endTime = "2018-03-23T" + content.split()[index + 3] + ":" + content.split()[index + 4] + ":00"
                                
                                if(content.split()[index + 5] in buildings):
                                    location = content.split()[index + 5] + ' ' + content.split()[index + 6][:3]
                                else:
                                    location = content.split()[index + 5] + ' ' + content.split()[index + 6][:4]

                            # Details to be saved for each course
                            details = {
                                "name": courseName,
                                "code": code,
                                "type": courseType,
                                "instructor": instructor,
                                "meeting_time": meetingTime,
                                "start_time": startTime,
                                "end_time": endTime,
                                "location": location
                            }

                            self.courses["UCI Courses"]["Terms"]["Winter 2018"]["Department"][courseDepartment][courseIdentifier] = details
                            self.courses["UCI Courses"]["Terms"]["Winter 2018"]["Department"][courseDepartment]["count"] += 1
                counter += 1
            return self.courses
                            
    def writeJson(self, l_, name):
        #convert list called {l_} to JSON file called {name}
        with open(name, 'w') as f:
            json.dump(l_, f)
                            
                        
if __name__ == "__main__":
    print("Collecting data...")
    p = UCIWebSoc()
    # Insert departments that should be scanned
    departments = ["CompSci", "Pol Sci"]

    for department in departments:
        p.classes(department)
   
    print("Writing JSON...")
    p.writeJson(p.courses, "courses.json")
    
    print("Complete")
