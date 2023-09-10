export default `tell application "System Events"
    set appInfo to {}
    set appProcesses to every process whose background only is false
    repeat with anApp in appProcesses
        set appName to name of anApp
        set appPID to unix id of anApp
        
        try
            set appPath to do shell script "ps aux | awk '/" & appPID & "/ && !/awk/ {print $11}'"
        on error errMsg
            set appPath to ""
            display dialog "Error retrieving path for " & appName & ": " & errMsg
        end try

        set lengthOfPath to count characters of appPath

        if lengthOfPath is 0 then
            set end of appInfo to {appName, appPID, appPath, ""}
        else
            tell application "Finder"
                try
                    set iconPath to (get icon of file appPath as alias) as text
                    set end of appInfo to {appName, appPID,appPath, iconPath}
                on error
                    set end of appInfo to {appName, appPID, appPath, ""}
                end try
            end tell
        end if
    end repeat
end tell
return appInfo
`;
