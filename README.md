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



Shooting chart next steps
- be able to select a player
- advanced shooting stats in bottom component


To ask
- Best way to display this data, the most important insights that can be made from info and how to display them
- colors of shooting stats
- 


Questions
More specific:
- For the lineup stint chart (middle #1), what important metrics should I display besides time on court and +/- in that time? What information about a the whole lineup is most important to display (want to put on the bottom of the screen)?
- For shooting chart (middle #2), what is the most efficient and helpful way to display the shots? What team/player shooting information is most important to display (want to put on the bottom of the screen)?
- For the team panel (left/right), what box-score type stats are most important to see? I also want to add overall team stats and trends below these tables(such as fastbreak points, rebounds, points in paint, etc), what would be important to display here?
- For each of these, what do you think ~the~ most important stat would be to make a quick decision, something I would want to make extremely obvious

More general:
- On sports science side, what are the most important metrics to consider that would be helpful to implement and display
- I need to emphasize readability and simplicity, is there anything you noticed that is unnecessary or anything that you know is done with the team that I should try. I'm not attached to anything so I'd be willing to get rid of anything that is not necessary
- Any other potential tips or suggestions would be awesome!



Ashley notes
Oliver, that is a great visual. I’ve worked with multiple basketball head coaches and they look at all of the box score, but certain details vary to each of them depending on their coaching philosophy/game plan. 

If you are able to create a slicer or tab where they can choose what to display, I think that will cover all your bases. 


ie: +/-, # of fouls, FG percentage, turnovers, etc. 

Some coaches want to know if somebody is “hot” (making 3 shots in a row). 


For the second visual, it looks a little messy/cluttered with all the colors. But, that is a great visual as it can help the coaches see how to defend a team (paint or perimeter). 

In sum, a slicer will really answer a lot of your issues and help different coaches. 


As far as sport science, a basic load and intensity chart is a good start. I don’t do in-game adjustments to athletes loads unless they are in a return-to-play state. Keep it simple. 

Volume, intensity, #decelerations, #accelerations, jump count. 