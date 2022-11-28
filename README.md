# spotlighttui
spotlighttui is a tui inspired by macos' spotlight functionality.  
using a drop down terminal like yakuake will enable you to select an action you want to run conveniently.
## install via [npm](https://npmjs.com/package/spotlighttui)
```bash
npm install --global spotlighttui
```  
## keys
pressing any key in the alphabet or number would activate the search function and disabling  
action selection with the left and right arrow keys.  
  
using the left and right arrow keys (when not in search mode) or up and down keys would  
change your action selection. pressing enter would run the script.
  
and finally, escape or control-c to leave the program.  
## configuration
create a `config.json` file in `~/.config/spotlighttui` and place these following values:  

- `shortcuts` should be an array with `shortcut` objects

a `shortcut` object has the following attributes:  

- `pinned` determines the piority of the shortcut (pinned shortcuts get displayed first)
- `name` determines the label of the element when in the in the tui
- `tags` is a string with words that help the search of the shortcut
- `foreground` is a string with the color you want to use as the foreground of the element
- `background` is a string with the color you want to use as the background of the element
- `execute` is an array with lines of bash code you want the shortcut to execute
## dependencies
- [blessed](https://github.com/chjj/blessed)