# in-game-basketball-app
Practice in-game visualizations app




notes:
- using vite


today 12/16
- struggled starting react 19 proj ended up using vite and react 18
- made intial basic setup for initial visualization
- struggled understanding what different data types were in the xml files 

tomorrow todo
- ask about data types in xml files
  - full timeout + short timeout = 0 when in game there were still timeouts left?
- get final first visualization from plan working for coaches
- plan out how to get display that will be for different groups (players, decided to do any others or not)

12/17
- got info about data types
- finished box scores
- got lineup one mostly done, didn't have as much time as hoped

12/18
- finish shooting chart
- call rivas for what stats to choose
    - ny, arsenal, teams, update
    - introduce project, go over any ideas
    - ask if any other people who might have good insight
    - datares and whole process

- https://medium.com/@fastbreakstatistics/creating-the-nba-shotchart-using-python-5c595374d905
    - https://www.google.com/search?q=code+to+draw+zones+on+an+nba+court&oq=code+to+draw+zones+on+an+nba+court&gs_lcrp=EgZjaHJvbWUyCQgAEEUYORigATIHCAEQIRigATIHCAIQIRigATIHCAMQIRirAjIHCAQQIRiPAjIHCAUQIRiPAtIBCDUwMDFqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8
- implemented the zones using react konva
- 

rivas call notes
- current rest of plan:
    - displaying missed and made shots, color coded zones per team, team advanced shooting stats at bottom
        - 
    - be able to select a player and see their shots and zones, player advanced shooting stats at bottom
        - 
    - lineup chart, will put each in position, will display important stint information for each player
        - 
    - bottom zone will rank the lineup by +/- compared to other lineups
        - 
    - left and right panels: get rid of players with 0:00, add another box with more advanced statistics (toggle between, or one above one below), or general team stats (fastbreak points, rebounds, points in paint, etc)
        -    



other
- a) being able to make your next decision, b) red light, green light, yellow light
    - should be easy to understand for hs coach, whoever old clippers coach is
- sports science end: intertia impacts, next game is big, cut bandwidth, load manage if theres another game coming up, 
- less is better, only need the information to make the next decision, nothing else
- knows women's basketball sports science i think, minnesota timberwolves scouting
- really liked shooting chart, example of who to draw a play to and where
- lineup chart, show key metrics, i mention +/- and maybe defensive efficiency, what else can i put to make it obvious who to sub out


xg bench vs main 