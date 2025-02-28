import requests

class Client:
    def __init__(self, session=None):
        self.session = session or requests.Session()

    def weather_api(self, url, params=None):
        response = self.session.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return [WeatherResponse(location) for location in data['locations']]

class WeatherResponse:
    def __init__(self, data):
        self.data = data

    def Latitude(self):
        return self.data['latitude']

    def Longitude(self):
        return self.data['longitude']

    def Elevation(self):
        return self.data.get('elevation', None)

    def Timezone(self):
        return self.data.get('timezone', None)

    def TimezoneAbbreviation(self):
        return self.data.get('timezone_abbreviation', None)

    def UtcOffsetSeconds(self):
        return self.data.get('utc_offset_seconds', None)

    def Hourly(self):
        return HourlyData(self.data['hourly'])

class HourlyData:
    def __init__(self, data):
        self.data = data

    def Time(self):
        return self.data['time'][0]

    def TimeEnd(self):
        return self.data['time'][-1]

    def Interval(self):
        return self.data['interval_seconds']

    def Variables(self, index):
        return Variables(self.data['variables'][index])

class Variables:
    def __init__(self, data):
        self.data = data

    def ValuesAsNumpy(self):
        import numpy as np
        return np.array(self.data['values'])